import DwellSyncLoadingScreen from './DwellSyncLoadingScreen';
import PageLoader from './PageLoader';
import InlineLoader from './InlineLoader';
import ButtonSpinner from './ButtonSpinner';
import CircularSpinner from './CircularSpinner';
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
export const Spinner = CircularSpinner;

export {
  DwellSyncLoadingScreen,
  PageLoader,
  InlineLoader,
  ButtonSpinner,
  CircularSpinner,
  CircularSpinner as LoadingSpinner,
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
  CircularSpinner,
  Spinner,
  LoadingSpinner: CircularSpinner,
  Skeleton,
  PropertyCardSkeleton,
  DashboardCardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  ListItemSkeleton,
};
