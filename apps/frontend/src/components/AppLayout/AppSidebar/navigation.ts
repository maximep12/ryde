import config from '@/config'
import { FileRouteTypes } from '@/routeTree.gen'
import {
  FileIcon,
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
  matchChildRoutes?: boolean // active when current path starts with this path (but not for other nav items that also start with it)
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
  {
    title: 'route.uploadData',
    path: '/example/upload',
    icon: UploadIcon,
    shouldHide: !config.featureFlags['upload-files'],
  },
  {
    title: 'route.myUploads',
    path: '/example/my-uploads',
    icon: FileIcon,
    matchChildRoutes: true,
    shouldHide: !config.featureFlags['upload-files'],
  },
  { title: 'route.kitchenSink', path: '/example/kitchen-sink', icon: PaletteIcon },
]
