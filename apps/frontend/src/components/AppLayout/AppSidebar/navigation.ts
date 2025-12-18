import { FileRouteTypes } from '@/routeTree.gen'
import { BookOpenIcon, HomeIcon, LibraryIcon, LucideIcon, UsersIcon } from 'lucide-react'

type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
}

export const navigation: NavigationItem[] = [
  { title: 'route.dashboard', path: '/', icon: HomeIcon },
  { title: 'route.books', path: '/books', icon: LibraryIcon },
  { title: 'route.users', path: '/users', icon: UsersIcon },
  { title: 'route.kitchenSink', path: '/kitchen-sink', icon: BookOpenIcon },
]
