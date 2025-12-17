import { FileRouteTypes } from '@/routeTree.gen'
import { BookOpenIcon, HomeIcon, LibraryIcon, LucideIcon } from 'lucide-react'

type NavigationItem = {
  title: string
  path: FileRouteTypes['to']
  icon: LucideIcon
}

export const navigation: NavigationItem[] = [
  { title: 'route.dashboard', path: '/', icon: HomeIcon },
  { title: 'route.books', path: '/books', icon: LibraryIcon },
  { title: 'route.kitchenSink', path: '/kitchen-sink', icon: BookOpenIcon },
]
