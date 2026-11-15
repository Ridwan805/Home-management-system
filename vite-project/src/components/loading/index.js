import DwellSyncLoadingScreen from './DwellSyncLoadingScreen';
import PageLoader from './PageLoader';
import InlineLoader from './InlineLoader';
import ButtonSpinner from './ButtonSpinner';
import Skeleton, {
  PropertyCardSkeleton,
  DashboardCardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  ListItemSkeleton,
} from './Skeleton';

// Canonical names matching project specification
export const AppLoader = DwellSyncLoadingScreen;
export const ButtonLoader = ButtonSpinner;
export const SkeletonLoader = Skeleton;

export {
  DwellSyncLoadingScreen,
  PageLoader,
  InlineLoader,
  ButtonSpinner,
  Skeleton,
  PropertyCardSkeleton,
  DashboardCardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  ListItemSkeleton,
};

export default {
  AppLoader,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  Skeleton,
  PropertyCardSkeleton,
  DashboardCardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  ListItemSkeleton,
};
