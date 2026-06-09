import { apiClient } from './apiClient';
import { Review, ReviewFormData } from '../types';

export const reviewService = {
  async getReviews(businessId: string, page: number = 1, limit: number = 20): Promise<Review[]> {
    try {
      const data = await apiClient.get<any>(
        `/businesses/${businessId}/reviews?page=${page}&limit=${limit}`
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createReview(
    _userId: string,
    appointmentId: string,
    businessId: string,
    data: ReviewFormData
  ): Promise<Review> {
    return await apiClient.post<Review>(`/appointments/${appointmentId}/review`, {
      businessId,
      rating: data.rating,
      comment: data.comment,
    });
  },

  async getReviewById(reviewId: string): Promise<Review> {
    return await apiClient.get<Review>(`/reviews/${reviewId}`);
  },
};

export const ownerReviewService = {
  async getAllReviews(): Promise<Review[]> {
    const data = await apiClient.get<any>('/owner/reviews');
    return Array.isArray(data) ? data : [];
  },

  async approveReview(reviewId: string): Promise<void> {
    await apiClient.post(`/owner/reviews/${reviewId}/approve`);
  },

  async rejectReview(reviewId: string): Promise<void> {
    await apiClient.post(`/owner/reviews/${reviewId}/reject`);
  },
};
