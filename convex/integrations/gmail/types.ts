export type GmailHeader = { name: string; value: string };

export type GmailMessagePartBody = {
  attachmentId?: string;
  data?: string;
  size?: number;
};

export type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
};

export type GmailMessageLite = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

export type GmailMessageFull = Omit<GmailMessageLite, "payload"> & {
  payload?: GmailMessagePart;
};
