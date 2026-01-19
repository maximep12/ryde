import { FileRouteTypes } from '@/routeTree.gen'
import {
  HomeIcon,
  ListIcon,
  LucideIcon,
  PaletteIcon,
  PlusCircleIcon,
  SearchIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'

export type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
  shouldHide?: boolean
  /** If true, this item will be active when the current path starts with this path (but not for other nav items that also start with it) */
  matchChildRoutes?: boolean
}

export const navigation: NavigationItem[] = [{ title: 'route.welcome', path: '/', icon: HomeIcon }]

export const adminNavigation: NavigationItem[] = [
  { title: 'route.users', path: '/admin/users', icon: UsersIcon },
]

export const exampleNavigation: NavigationItem[] = [
  {
    title: 'route.clientsLookup',
    path: '/example/clients',
    icon: SearchIcon,
    matchChildRoutes: true,
  },
  { title: 'route.clientsAdd', path: '/example/clients/new', icon: PlusCircleIcon },
  { title: 'route.ordersMonitor', path: '/example/orders', icon: ListIcon, matchChildRoutes: true },
  { title: 'route.ordersCreate', path: '/example/orders/new', icon: PlusCircleIcon },
  { title: 'route.uploadData', path: '/example/upload', icon: UploadIcon },
  { title: 'route.kitchenSink', path: '/example/kitchen-sink', icon: PaletteIcon },
]
