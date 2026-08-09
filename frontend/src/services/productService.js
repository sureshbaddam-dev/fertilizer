import { apiClient } from './apiClient';

export const productService = {
  async getProducts(params = {}) {
    return await apiClient.get('/products', { params });
  },

  async getTopSellingProducts(params = {}) {
    return await apiClient.get('/products/top-selling', { params });
  },

  async getProductById(id) {
    return await apiClient.get(`/products/${id}`);
  },

  async createProduct(data) {
    return await apiClient.post('/products', data);
  },

  async updateProduct(idOrPayload, dataPayload) {
    let targetId;
    let payload;

    if (typeof idOrPayload === 'string' || typeof idOrPayload === 'number') {
      targetId = idOrPayload;
      payload = dataPayload;
    } else if (idOrPayload && typeof idOrPayload === 'object') {
      targetId = idOrPayload.id || idOrPayload._id || idOrPayload.productId;
      const { id, _id, productId, ...restPayload } = idOrPayload;
      payload = dataPayload || restPayload;
    }

    const cleanId = (targetId || '').toString().trim();
    const generatedUrl = `/products/${cleanId}`;

    console.log('====================================================');
    console.log('🔍 [productService.updateProduct] EDIT PRODUCT REQUEST');
    console.log('----------------------------------------------------');
    console.log('• Selected Product :', idOrPayload);
    console.log('• Product ID       :', cleanId || 'UNDEFINED/MISSING');
    console.log('• Generated API URL:', generatedUrl);
    console.log('• Payload          :', payload);
    console.log('====================================================');

    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      console.error('❌ [productService.updateProduct] Product ID is missing! Aborting API request.');
      throw new Error('Product ID is missing. Cannot update product.');
    }

    return await apiClient.put(generatedUrl, payload);
  },

  async deactivateProduct(id) {
    return await apiClient.patch(`/products/${id}/deactivate`);
  },

  async restoreProduct(id) {
    return await apiClient.patch(`/products/${id}/activate`);
  },

  async getProductHistory(id) {
    return await apiClient.get(`/products/${id}/history`);
  },

  async updateBatch(batchId, data) {
    return await apiClient.patch(`/products/batches/${batchId}`, data);
  },
};
