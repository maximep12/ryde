import { FileRouteTypes } from '@/routeTree.gen'
import {
  ExternalLinkIcon,
  HomeIcon,
  LibraryIcon,
  ListIcon,
  LucideIcon,
  PaletteIcon,
  PlusCircleIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'

export type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
  shouldHide?: boolean
}

export const navigation: NavigationItem[] = [
  { title: 'route.welcome', path: '/', icon: HomeIcon },
  { title: 'route.users', path: '/users', icon: UsersIcon },
]

export const clientsNavigation: NavigationItem[] = [
  { title: 'route.clientsLookup', path: '/clients', icon: SearchIcon },
  { title: 'route.clientsAdd', path: '/clients/new', icon: PlusCircleIcon },
]

export const ordersNavigation: NavigationItem[] = [
  { title: 'route.ordersMonitor', path: '/orders', icon: ListIcon },
  { title: 'route.ordersCreate', path: '/orders/new', icon: PlusCircleIcon },
]

export const examplesNavigation: NavigationItem[] = [
  { title: 'route.books', path: '/examples/books', icon: LibraryIcon, shouldHide: true },
]

export const uiUxNavigation: NavigationItem[] = [
  { title: 'route.kitchenSink', path: '/kitchen-sink', icon: PaletteIcon, shouldHide: true },
]

export type ExternalLinkItem = {
  title: string
  url: string
  icon: LucideIcon
}

export const externalNavigation: ExternalLinkItem[] = [
  { title: 'external.mistyNet', url: 'https://google.com', icon: ExternalLinkIcon },
]
