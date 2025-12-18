import { FileRouteTypes } from '@/routeTree.gen'
import { HomeIcon, LibraryIcon, LucideIcon, PaletteIcon, UsersIcon } from 'lucide-react'

type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
}

export const navigation: NavigationItem[] = [
  { title: 'route.dashboard', path: '/', icon: HomeIcon },
  { title: 'route.users', path: '/users', icon: UsersIcon },
]

export const examplesNavigation: NavigationItem[] = [
  { title: 'route.books', path: '/examples/books', icon: LibraryIcon },
]

export const uiUxNavigation: NavigationItem[] = [
  { title: 'route.kitchenSink', path: '/kitchen-sink', icon: PaletteIcon },
]
