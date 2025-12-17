import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/kitchen-sink/')({
  component: KitchenSinkPage,
})

function KitchenSinkPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Kitchen Sink</h1>
      <p className="text-muted-foreground mt-2">
        A showcase of UI components and patterns.
      </p>
    </div>
  )
}
