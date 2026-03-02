import "~/styles/globals.css"

import { Inter } from "next/font/google"
import { AppContext } from "./context"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Ryde Dashboard",
  description: "Ryde Dashboard",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <AppContext>{children}</AppContext>
      </body>
    </html>
  )
}
