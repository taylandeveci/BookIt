import { apiClient } from './apiClient';
import { Review, ReviewFormData } from '../types';

export const reviewService = {
  async getReviews(businessId: string, page: number = 1, limit: number = 20): Promise<Review[]> {
    try {
      const response = await apiClient.get<any>(
        `/businesses/${businessId}/reviews?page=${page}&limit=${limit}`
      );
      
      // Normalize various possible response shapes
      let reviews: any = response;
      
      // Handle { success: true, data: ... }
      if (reviews && typeof reviews === 'object' && 'data' in reviews) {
        reviews = reviews.data;
      }
      
      // Handle nested { data: { data: [...] } } or { data: { items: [...] } }
      if (reviews && typeof reviews === 'object' && !Array.isArray(reviews)) {
        if ('data' in reviews && Array.isArray(reviews.data)) {
          reviews = reviews.data;
        } else if ('items' in reviews && Array.isArray(reviews.items)) {
          reviews = reviews.items;
        }
      }
      
      // Ensure we always return an array
      return Array.isArray(reviews) ? reviews : [];
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  },

  async createReview(
    userId: string,
    appointmentId: string,
    businessId: string,
    data: ReviewFormData
  ): Promise<Review> {
    return await apiClient.post<Review>('/reviews', {
      userId,
      appointmentId,
      businessId,
      rating: data.rating,
      comment: data.comment,
    });
  },

  async getReviewById(reviewId: string): Promise<Review> {
    return await apiClient.get<Review>(`/reviews/${reviewId}`);
  },
};
