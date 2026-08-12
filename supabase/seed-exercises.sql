-- Kynetic exercise library seed.
-- Run after schema.sql. Safe to re-run: upserts on slug.
--
-- demo_media_url points at Supabase Storage. Create a PUBLIC bucket named
-- `exercise-media`, upload the clips, and the paths below resolve. Rows with a
-- null demo_media_url still render instructions and cues, so the library is
-- usable before any media is uploaded.
--
-- vision_kind is the live-guidance gate. Only simple bodyweight patterns that a
-- single webcam can judge reliably get a value. Loaded, complex or
-- floor/overhead movements stay NULL and are logged manually.

insert into public.exercises
  (slug, name, muscle_group, equipment, difficulty, instructions, cues, demo_media_url, vision_kind)
values
  -- ---------------------------------------------------------------------
  -- Live-guidance capable (simple bodyweight patterns)
  -- ---------------------------------------------------------------------
  ('bodyweight-squat', 'Bodyweight squat', 'Lower body', 'bodyweight', 'beginner',
   array[
     'Stand with feet shoulder width apart, toes turned slightly out.',
     'Push your hips back and bend your knees to lower down.',
     'Descend until your thighs are at least parallel to the floor.',
     'Drive through your whole foot to stand back up.'
   ],
   array['Chest stays proud', 'Knees track over toes', 'Heels stay planted'],
   'exercise-media/bodyweight-squat.mp4', 'squat'),

  ('push-up', 'Push-up', 'Chest', 'bodyweight', 'beginner',
   array[
     'Set your hands slightly wider than your shoulders.',
     'Brace your core so your body forms one straight line.',
     'Lower until your chest is just above the floor.',
     'Press back up without letting your hips sag.'
   ],
   array['Body in one line', 'Elbows about 45 degrees', 'Full lockout at the top'],
   'exercise-media/push-up.mp4', 'pushup'),

  ('knee-push-up', 'Knee push-up', 'Chest', 'bodyweight', 'beginner',
   array[
     'Kneel and place your hands slightly wider than your shoulders.',
     'Keep a straight line from your knees to your head.',
     'Lower your chest toward the floor under control.',
     'Press back up to full arm extension.'
   ],
   array['Hips stay in line with knees', 'Control the descent'],
   'exercise-media/knee-push-up.mp4', 'pushup'),

  ('reverse-lunge', 'Reverse lunge', 'Lower body', 'bodyweight', 'beginner',
   array[
     'Stand tall with your feet hip width apart.',
     'Step one foot back and lower until both knees bend about 90 degrees.',
     'Keep your torso upright throughout.',
     'Push through the front foot to return to standing.'
   ],
   array['Torso upright', 'Front knee over ankle', 'Control the step back'],
   'exercise-media/reverse-lunge.mp4', 'lunge'),

  ('glute-bridge', 'Glute bridge', 'Glutes', 'bodyweight', 'beginner',
   array[
     'Lie on your back with knees bent and feet flat on the floor.',
     'Squeeze your glutes and lift your hips toward the ceiling.',
     'Pause at the top with your body in a straight line.',
     'Lower with control without resting fully between reps.'
   ],
   array['Squeeze at the top', 'Ribs stay down', 'Push through the heels'],
   'exercise-media/glute-bridge.mp4', 'glute_bridge'),

  -- ---------------------------------------------------------------------
  -- Demo + manual logging only (vision_kind stays NULL)
  -- ---------------------------------------------------------------------
  ('goblet-squat', 'Goblet squat', 'Lower body', 'dumbbells', 'intermediate',
   array[
     'Hold one dumbbell or kettlebell at chest height.',
     'Sit your hips back and down between your feet.',
     'Keep your elbows inside your knees at the bottom.',
     'Stand by driving through your whole foot.'
   ],
   array['Elbows inside knees', 'Weight stays close to the chest'],
   'exercise-media/goblet-squat.mp4', null),

  ('bent-over-row', 'Bent-over row', 'Back', 'dumbbells', 'intermediate',
   array[
     'Hinge at the hips with a neutral spine and soft knees.',
     'Let the weights hang directly below your shoulders.',
     'Pull the weights toward your lower ribs.',
     'Lower slowly to a full stretch.'
   ],
   array['Neutral spine', 'Pull to the lower ribs', 'No torso swing'],
   'exercise-media/bent-over-row.mp4', null),

  ('dumbbell-bench-press', 'Dumbbell bench press', 'Chest', 'dumbbells', 'intermediate',
   array[
     'Lie back on a bench holding a dumbbell in each hand.',
     'Start with the weights just outside your chest.',
     'Press up until your arms are extended over your chest.',
     'Lower under control to the starting position.'
   ],
   array['Shoulder blades pinned', 'Wrists stacked over elbows'],
   'exercise-media/dumbbell-bench-press.mp4', null),

  ('romanian-deadlift', 'Romanian deadlift', 'Hamstrings', 'barbell', 'advanced',
   array[
     'Hold the bar at hip height with a shoulder width grip.',
     'Push your hips back and slide the bar down your thighs.',
     'Stop when you feel a strong hamstring stretch.',
     'Drive your hips forward to stand tall.'
   ],
   array['Bar stays close to the legs', 'Back stays flat', 'Hips lead the movement'],
   'exercise-media/romanian-deadlift.mp4', null),

  ('overhead-press', 'Overhead press', 'Shoulders', 'dumbbells', 'advanced',
   array[
     'Hold the weights at shoulder height with your elbows forward.',
     'Brace your core and squeeze your glutes.',
     'Press overhead until your arms are locked out.',
     'Lower back to shoulder height under control.'
   ],
   array['Ribs down', 'Do not lean back', 'Full lockout overhead'],
   'exercise-media/overhead-press.mp4', null),

  ('plank', 'Plank', 'Core', 'bodyweight', 'beginner',
   array[
     'Set your elbows directly under your shoulders.',
     'Extend your legs so your body forms one straight line.',
     'Tuck your ribs and squeeze your glutes.',
     'Hold for the prescribed time while breathing steadily.'
   ],
   array['Hips level', 'Ribs tucked', 'Breathe steadily'],
   'exercise-media/plank.mp4', null),

  ('dead-bug', 'Dead bug', 'Core', 'bodyweight', 'beginner',
   array[
     'Lie on your back with arms up and knees bent at 90 degrees.',
     'Press your lower back into the floor.',
     'Extend the opposite arm and leg away from each other.',
     'Return to the start and switch sides.'
   ],
   array['Lower back stays flat', 'Move slowly'],
   'exercise-media/dead-bug.mp4', null),

  ('marching-high-knees', 'Marching high knees', 'Conditioning', 'bodyweight', 'beginner',
   array[
     'Stand tall with your core braced.',
     'Drive one knee up toward hip height.',
     'Alternate legs at a brisk, sustainable rhythm.',
     'Land softly on the ball of your foot.'
   ],
   array['Stay tall', 'Land softly', 'Steady rhythm'],
   'exercise-media/marching-high-knees.mp4', null),

  ('mountain-climber', 'Mountain climber', 'Conditioning', 'bodyweight', 'intermediate',
   array[
     'Start in a high plank with your hands under your shoulders.',
     'Drive one knee toward your chest.',
     'Switch legs while keeping your hips low and level.',
     'Maintain a steady pace for the prescribed time.'
   ],
   array['Hips stay low', 'Shoulders over hands'],
   'exercise-media/mountain-climber.mp4', null),

  ('jumping-jack', 'Jumping jack', 'Conditioning', 'bodyweight', 'beginner',
   array[
     'Start with your feet together and arms at your sides.',
     'Jump your feet out while raising your arms overhead.',
     'Jump back to the starting position.',
     'Keep a light, springy rhythm.'
   ],
   array['Land softly', 'Full arm extension overhead'],
   'exercise-media/jumping-jack.mp4', null)

on conflict (slug) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group,
  equipment = excluded.equipment,
  difficulty = excluded.difficulty,
  instructions = excluded.instructions,
  cues = excluded.cues,
  demo_media_url = excluded.demo_media_url,
  vision_kind = excluded.vision_kind,
  updated_at = now();
