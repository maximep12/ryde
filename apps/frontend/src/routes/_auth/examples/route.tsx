import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/examples')({
  component: () => <Outlet />,
  staticData: {
    title: 'route.examples',
    crumb: 'route.examples',
  },
})
