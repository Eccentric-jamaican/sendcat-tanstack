/* eslint-disable no-console */
const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
const host = process.env.POSTHOG_HOST || "https://us.posthog.com";
const dashboardName =
  process.env.POSTHOG_DASHBOARD_NAME || "Sendcat Core Analytics";
const dashboardIdOverride = process.env.POSTHOG_DASHBOARD_ID;

if (!apiKey || !projectId) {
  console.error(
    "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in the environment.",
  );
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
};

const getJson = async (path) => {
  const response = await fetch(`${host}${path}`, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `GET ${path} failed: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`,
    );
  }
  return payload;
};

const postJson = async (path, body) => {
  const response = await fetch(`${host}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `POST ${path} failed: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`,
    );
  }
  return payload;
};

const buildTrendsQuery = (eventName, options = {}) => ({
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      {
        kind: "EventsNode",
        name: eventName,
        event: eventName,
        math: "total",
        version: 1,
        ...(options.math ? { math: options.math } : {}),
        ...(options.math_property ? { math_property: options.math_property } : {}),
      },
    ],
    interval: "day",
    dateRange: {
      date_from: "-30d",
      date_to: null,
    },
    ...Object.fromEntries(
      Object.entries(options).filter(
        ([key]) =>
          key !== "math" &&
          key !== "math_property" &&
          key !== "breakdown" &&
          key !== "breakdown_type",
      ),
    ),
    ...(options.breakdown
      ? {
          breakdownFilter: {
            breakdowns: [
              {
                property: options.breakdown,
                type: options.breakdown_type || "event",
              },
            ],
          },
        }
      : {}),
    version: 1,
  },
  version: 1,
});

const insights = [
  {
    name: "Sign-up views (daily)",
    query: buildTrendsQuery("sign_up_view"),
  },
  {
    name: "Sign-ups completed (daily)",
    query: buildTrendsQuery("sign_up_completed"),
  },
  {
    name: "Searches submitted (daily)",
    query: buildTrendsQuery("search_submitted"),
  },
  {
    name: "Product drawer opens (daily)",
    query: buildTrendsQuery("product_drawer_open"),
  },
  {
    name: "Visit merchant clicks (daily)",
    query: buildTrendsQuery("visit_merchant_click"),
  },
  {
    name: "Favorites added (daily)",
    query: buildTrendsQuery("favorite_added"),
  },
  {
    name: "Messages sent (daily)",
    query: buildTrendsQuery("message_send"),
  },
  {
    name: "LLM cost (daily)",
    query: buildTrendsQuery("llm_usage", {
      math: "sum",
      math_property: "cost",
    }),
  },
  {
    name: "LLM tokens (daily)",
    query: buildTrendsQuery("llm_usage", {
      math: "sum",
      math_property: "total_tokens",
    }),
  },
  {
    name: "LLM usage by model",
    query: buildTrendsQuery("llm_usage", {
      breakdown: "model_id",
    }),
  },
  {
    name: "LLM quality feedback",
    query: buildTrendsQuery("llm_quality_feedback", {
      breakdown: "response",
    }),
  },
  {
    name: "Time of day usage (messages)",
    query: buildTrendsQuery("message_send", {
      breakdown: "time_of_day_bucket",
    }),
  },
  {
    name: "Seasonality (monthly messages)",
    query: buildTrendsQuery("message_send", {
      breakdown: "month_et",
      interval: "month",
    }),
  },
];

const main = async () => {
  let dashboardId = dashboardIdOverride;
  if (!dashboardId) {
    console.log("Creating dashboard...");
    const dashboard = await postJson(`/api/projects/${projectId}/dashboards/`, {
      name: dashboardName,
      description: "Auto-generated Sendcat analytics dashboard.",
      pinned: true,
    });
    dashboardId = String(dashboard.id);
    console.log(`Dashboard created: ${dashboardId}`);
  } else {
    console.log(`Using existing dashboard: ${dashboardId}`);
  }

  let existingNames = new Set();
  try {
    const insightsResponse = await getJson(
      `/api/projects/${projectId}/insights/?limit=200`,
    );
    const insights = Array.isArray(insightsResponse.results)
      ? insightsResponse.results
      : [];
    insights
      .filter((insight) =>
        Array.isArray(insight.dashboards)
          ? insight.dashboards.includes(Number(dashboardId))
          : false,
      )
      .forEach((insight) => {
        if (insight.name) existingNames.add(insight.name);
      });
  } catch (error) {
    console.warn(
      "Could not prefetch existing insights; duplicates may be created.",
    );
  }

  for (const insight of insights) {
    try {
      if (existingNames.has(insight.name)) {
        console.log(`  ↷ Skipping existing insight: ${insight.name}`);
        continue;
      }
      const created = await postJson(
        `/api/projects/${projectId}/insights/`,
        {
          name: insight.name,
          query: insight.query,
          dashboards: [Number(dashboardId)],
        },
      );
      console.log(`  ✔ Insight created: ${created.id} (${insight.name})`);
    } catch (error) {
      console.error(`  ✖ Failed to create insight "${insight.name}"`);
      console.error(error instanceof Error ? error.message : error);
    }
  }

  console.log("Done.");
};

main().catch((error) => {
  console.error("Failed to create dashboard:", error);
  process.exit(1);
});
