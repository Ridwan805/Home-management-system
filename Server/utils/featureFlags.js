/**
 * Feature Flags Configuration for DwellSync
 * Enables or disables features across backend workflows based on environment variables.
 */

const isPropertySalesEnabled = () => {
  return process.env.ENABLE_PROPERTY_SALES === 'true';
};

module.exports = {
  isPropertySalesEnabled
};
