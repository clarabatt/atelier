import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, {user?.display_name ?? 'there'}!</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.placeholder}>Your study topics will appear here.</Text>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 15,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  logoutButton: {
    marginTop: 'auto',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    color: '#64748b',
  },
});
