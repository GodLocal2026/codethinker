import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'CodeThinker — AI Coding Assistant',
  description: 'Chain-of-thought AI for developers. 6 modes, local AI via WebGPU, multi-model fallback.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
