import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/example')({
  component: () => <Outlet />,
  staticData: {
    title: 'route.examples',
    crumb: 'route.examples',
  },
})
