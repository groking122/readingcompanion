"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, CheckCircle2, XCircle } from "lucide-react"
import { notificationService } from "@/lib/notifications"

export function ReviewReminderSettings() {
  const [permission, setPermission] = useState(notificationService.getPermissionStatus())
  const [enabled, setEnabled] = useState(false)
  const [checkInterval, setCheckInterval] = useState(60) // minutes

  useEffect(() => {
    setEnabled(notificationService.isEnabled())
  }, [])

  const handleRequestPermission = async () => {
    const newPermission = await notificationService.requestPermission()
    setPermission(newPermission)
  }

  const handleEnableReminders = () => {
    if (permission.granted) {
      notificationService.startReminders(checkInterval)
      setEnabled(true)
    }
  }

  const handleDisableReminders = () => {
    notificationService.stopReminders()
    setEnabled(false)
  }

  const handleTestNotification = () => {
    notificationService.showNotification("Test Notification", {
      body: "If you see this, notifications are working!",
    })
  }

  return (
    <Card className="bento-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Review Reminders
        </CardTitle>
        <CardDescription>
          Get notified when you have flashcards due for review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {permission.granted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : permission.denied ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {permission.granted
                ? "Notifications Enabled"
                : permission.denied
                ? "Notifications Blocked"
                : "Permission Not Granted"}
            </span>
          </div>
          {!permission.granted && !permission.denied && (
            <Button size="sm" onClick={handleRequestPermission}>
              Enable
            </Button>
          )}
        </div>

        {/* Reminder Controls */}
        {permission.granted && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Check Interval</label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                disabled={enabled}
              >
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={120}>Every 2 hours</option>
                <option value={240}>Every 4 hours</option>
                <option value={480}>Every 8 hours</option>
              </select>
            </div>

            <div className="flex gap-2">
              {!enabled ? (
                <Button onClick={handleEnableReminders} className="flex-1">
                  <Bell className="h-4 w-4 mr-2" />
                  Start Reminders
                </Button>
              ) : (
                <Button onClick={handleDisableReminders} variant="outline" className="flex-1">
                  <BellOff className="h-4 w-4 mr-2" />
                  Stop Reminders
                </Button>
              )}
              <Button onClick={handleTestNotification} variant="outline" size="sm">
                Test
              </Button>
            </div>
          </>
        )}

        {permission.denied && (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

