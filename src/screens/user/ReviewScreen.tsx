import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { reviewService } from '../../services/reviewService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button, RatingStars, Card, Toast } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'Review'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ReviewScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async () => {
    if (!user) return;

    if (!comment.trim()) {
      Alert.alert('Error', 'Please write a comment');
      return;
    }

    setLoading(true);
    try {
      await reviewService.createReview(
        user.id,
        route.params.appointmentId,
        route.params.businessId,
        { rating, comment }
      );
      
      setToast({
        message: 'Review submitted! Awaiting business approval.',
        type: 'success',
      });
      
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to submit review',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text
            style={[
              styles.title,
              typography.heading,
              { color: colors.foreground },
            ]}
          >
            How was your experience?
          </Text>

          <Text
            style={[
              styles.subtitle,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Your review will be visible after business approval
          </Text>

          <View style={styles.ratingSection}>
            <Text
              style={[
                styles.label,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              Rating
            </Text>
            <RatingStars
              rating={rating}
              size={40}
              interactive
              onRate={setRating}
            />
          </View>

          <View style={styles.commentSection}>
            <Text
              style={[
                styles.label,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              Your Review
            </Text>
            <RNTextInput
              style={[
                styles.commentInput,
                typography.body,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.foreground,
                  borderRadius: borderRadius.lg,
                },
              ]}
              placeholder="Share your thoughts about the service..."
              placeholderTextColor={colors.placeholder}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <Button
            title="Submit Review"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  commentSection: {
    marginBottom: spacing.xl,
  },
  commentInput: {
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: typography.sizes.md,
    minHeight: 120,
  },
});
