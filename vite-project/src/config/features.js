/**
 * Client-side Feature Flags Configuration for DwellSync
 * Controls visibility of feature workflows such as property sales.
 */

export const isPropertySalesEnabled = () => {
  return import.meta.env.VITE_ENABLE_PROPERTY_SALES === 'true';
};

export default {
  isPropertySalesEnabled
};
