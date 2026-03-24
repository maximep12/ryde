import { FileRouteTypes } from '@/routeTree.gen'
import {
  BarChart3Icon,
  BoxIcon,
  Building2Icon,
  ClipboardCheckIcon,
  FileTextIcon,
  HomeIcon,
  LucideIcon,
  PackageIcon,
  PlusCircleIcon,
  ShoppingCartIcon,
  StoreIcon,
  TargetIcon,
  TrendingDownIcon,
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

export const dashboardNavigation: NavigationItem[] = [
  { title: 'route.commercial', path: '/commercial', icon: BarChart3Icon },
  { title: 'route.sellout', path: '/sellout', icon: TrendingDownIcon },
  { title: 'route.inventory', path: '/inventory', icon: BoxIcon },
  { title: 'route.reports', path: '/reports', icon: FileTextIcon },
  { title: 'route.amazon', path: '/amazon', icon: PackageIcon },
]
