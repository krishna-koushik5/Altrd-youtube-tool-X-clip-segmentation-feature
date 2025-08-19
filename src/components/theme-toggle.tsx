"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]"
      >
        <Sun className="h-4 w-4 mr-3" />
        <span className="ml-3">Theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 mr-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 ml-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="ml-3 dark:ml-0">
        {theme === "dark" ? "Dark Mode" : "Light Mode"}
      </span>
    </Button>
  )
} 