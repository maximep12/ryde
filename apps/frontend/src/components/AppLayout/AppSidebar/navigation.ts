import { FileRouteTypes } from '@/routeTree.gen'
import {
  ContactIcon,
  HomeIcon,
  LibraryIcon,
  LucideIcon,
  PaletteIcon,
  UsersIcon,
} from 'lucide-react'

export type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
  shouldHide?: boolean
}

export const navigation: NavigationItem[] = [
  { title: 'route.dashboard', path: '/', icon: HomeIcon },
  { title: 'route.users', path: '/users', icon: UsersIcon },
]

export const examplesNavigation: NavigationItem[] = [
  { title: 'route.books', path: '/examples/books', icon: LibraryIcon },
  { title: 'route.clients', path: '/examples/clients', icon: ContactIcon },
]

export const uiUxNavigation: NavigationItem[] = [
  { title: 'route.kitchenSink', path: '/kitchen-sink', icon: PaletteIcon },
]
