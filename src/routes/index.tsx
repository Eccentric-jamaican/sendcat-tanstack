import { createFileRoute } from '@tanstack/react-router'
import { Sidebar } from '../components/Sidebar'
import { ChatInput, type ChatInputHandle } from '../components/ChatInput'
import { LandingHero } from '../components/LandingHero'
import { useRef } from 'react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const chatInputRef = useRef<ChatInputHandle>(null)

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className="edge-glow-top" />
      <div className="edge-glow-bottom" />
      <div className="bg-noise" />
      
      <Sidebar />
      
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 z-20">
        <LandingHero onSelectPrompt={(text) => chatInputRef.current?.setContentAndSend(text)} />
        <ChatInput ref={chatInputRef} />
      </main>
    </div>
  )
}
