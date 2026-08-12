import { createClient } from '@supabase/supabase-js';

const url = 'https://dvhoecidlstiijvzyfzl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2aG9lY2lkbHN0aWlqdnp5ZnpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUxMzkwOCwiZXhwIjoyMTAyMDg5OTA4fQ.5UQnna9FiAeePVgt8uERtCE4sJRLyU4uotGLhcYfncE';

const supabase = createClient(url, key);

async function main() {
  const email = 'm.shahmeer.shahid18@gmail.com';
  
  console.log('Finding user...', email);
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Auth error:', authError);
    process.exit(1);
  }
  
  let user = users.find(u => u.email === email);
  if (!user) {
    console.log('User not found. Creating auth user...');
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { full_name: 'Muhammad Shahmeer Shahid' },
      password: 'password123'
    });
    if (createError) throw createError;
    user = newUserData.user;
  }
  
  console.log('User found! Uploading profile data...');
  
  const payload = {
    id: user.id,
    email: user.email,
    full_name: 'Muhammad Shahmeer Shahid',
    age: 25,
    gender: 'male',
    height_cm: 180,
    weight_kg: 75,
    fitness_level: 'beginner',
    goal: 'build-muscle',
    equipment: ['Dumbbells', 'Barbell'],
    experience_level: 'beginner',
    bmi: 23.1,
    avatar_state: 'normal-beginner',
    onboarding_completed: true
  };
  
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
  
  if (error) {
    console.error('Failed to upload profile data:', error);
  } else {
    console.log('Demo profile data uploaded successfully!');
  }
}

main();
