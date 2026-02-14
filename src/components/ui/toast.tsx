import * as React from "react"

export type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    variant?: "default" | "destructive"
}

export type ToastActionElement = React.ReactElement

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
    ({ className, variant, ...props }, ref) => {
        return <div ref={ref} {...props} />
    }
)
Toast.displayName = "Toast"
