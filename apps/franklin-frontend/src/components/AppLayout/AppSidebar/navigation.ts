import config from '@/config'
import { FileRouteTypes } from '@/routeTree.gen'
import {
  Building2Icon,
  ClipboardCheckIcon,
  FileIcon,
  HomeIcon,
  ListIcon,
  LucideIcon,
  PackageIcon,
  PaletteIcon,
  PlusCircleIcon,
  SearchIcon,
  ShoppingCartIcon,
  StoreIcon,
  TargetIcon,
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
  { title: 'route.imports', path: '/admin/imports', icon: PlusCircleIcon },
]

export const dataManagerNavigation: NavigationItem[] = [
  { title: 'route.imports', path: '/admin/imports', icon: PlusCircleIcon },
]

export const importsNavigation: NavigationItem[] = [
  { title: 'route.importCustomers', path: '/admin/imports/customers', icon: StoreIcon },
  { title: 'route.importSellInTargets', path: '/admin/imports/sell-in-targets', icon: TargetIcon },
  {
    title: 'route.importSellInOrders',
    path: '/admin/imports/sell-in-orders',
    icon: ShoppingCartIcon,
  },
  {
    title: 'route.importSellInOrdersConfirmed',
    path: '/admin/imports/sell-in-orders-confirmed',
    icon: ClipboardCheckIcon,
  },
  {
    title: 'route.importSellInOrdersConfirmed7Eleven',
    path: '/admin/imports/sell-in-orders-confirmed-7-eleven',
    icon: Building2Icon,
  },
  {
    title: 'route.importAmazonOrders',
    path: '/admin/imports/amazon-orders',
    icon: PackageIcon,
  },
  {
    title: 'route.importAmazonBundles',
    path: '/admin/imports/amazon-bundles',
    icon: ShoppingCartIcon,
  },
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
