import { FileRouteTypes } from '@/routeTree.gen'
import {
  BoxesIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HomeIcon,
  LibraryIcon,
  ListIcon,
  LucideIcon,
  PackageIcon,
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

export const supplyDemandNavigation: NavigationItem[] = [
  { title: 'route.supplyDemandReports', path: '/supply-demand/reports', icon: FileTextIcon },
  {
    title: 'route.supplyDemandProductStatus',
    path: '/supply-demand/product-status',
    icon: PackageIcon,
  },
  { title: 'route.supplyDemandInventory', path: '/supply-demand/inventory', icon: BoxesIcon },
  { title: 'route.supplyDemandOpenPO', path: '/supply-demand/open-po', icon: ClipboardListIcon },
  { title: 'route.supplyDemandUpload', path: '/supply-demand/upload', icon: UploadIcon },
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
