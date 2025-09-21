import { WorkoutPlan, WorkoutStep } from '@/types';

export const createWorkoutTemplates = (): WorkoutPlan[] => {
  const now = Date.now();

  return [
    // Beginner Templates
    {
      id: 'template_beginner_intro',
      name: 'Beginner Introduction',
      description: 'A gentle 20-minute introduction to indoor cycling',
      equipmentType: 'bike',
      difficulty: 1,
      tags: ['beginner', 'introduction', 'easy'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 1200, // 20 minutes
      steps: [
        {
          id: 'warmup_1',
          name: 'Gentle Warm-up',
          description: 'Start slowly and get comfortable',
          duration: 300, // 5 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 20,
            cadence: 60,
            power: 80
          }
        },
        {
          id: 'main_1',
          name: 'Steady Ride',
          description: 'Maintain a comfortable pace',
          duration: 600, // 10 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 30,
            cadence: 70,
            power: 100
          }
        },
        {
          id: 'cooldown_1',
          name: 'Cool Down',
          description: 'Gradually reduce intensity',
          duration: 300, // 5 minutes
          type: 'cooldown',
          targetMetrics: {
            resistance: 15,
            cadence: 50,
            power: 60
          }
        }
      ]
    },

    {
      id: 'template_fat_burn',
      name: 'Fat Burn Zone',
      description: 'Moderate intensity fat-burning session',
      equipmentType: 'bike',
      difficulty: 2,
      tags: ['fat-burn', 'endurance', 'moderate'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 2400, // 40 minutes
      steps: [
        {
          id: 'warmup_fb',
          name: 'Warm-up',
          description: 'Prepare your body for exercise',
          duration: 300, // 5 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 25,
            cadence: 65,
            power: 90
          }
        },
        {
          id: 'main_fb_1',
          name: 'Fat Burn Zone 1',
          description: 'Moderate steady effort',
          duration: 600, // 10 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 40,
            cadence: 75,
            power: 130
          }
        },
        {
          id: 'main_fb_2',
          name: 'Fat Burn Zone 2',
          description: 'Slightly higher intensity',
          duration: 900, // 15 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 45,
            cadence: 80,
            power: 150
          }
        },
        {
          id: 'main_fb_3',
          name: 'Fat Burn Zone 3',
          description: 'Final steady effort',
          duration: 600, // 10 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 40,
            cadence: 75,
            power: 130
          }
        }
      ]
    },

    // Intermediate Templates
    {
      id: 'template_interval_basic',
      name: 'Basic Intervals',
      description: '30-minute interval training for fitness improvement',
      equipmentType: 'bike',
      difficulty: 3,
      tags: ['interval', 'fitness', 'moderate'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 1800, // 30 minutes
      steps: [
        {
          id: 'warmup_int',
          name: 'Warm-up',
          description: 'Prepare for intervals',
          duration: 300, // 5 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 30,
            cadence: 70,
            power: 100
          }
        },
        {
          id: 'interval_1',
          name: 'Interval 1',
          description: 'High intensity effort',
          duration: 120, // 2 minutes
          type: 'interval',
          targetMetrics: {
            resistance: 60,
            cadence: 90,
            power: 200
          }
        },
        {
          id: 'recovery_1',
          name: 'Recovery 1',
          description: 'Active recovery',
          duration: 180, // 3 minutes
          type: 'recovery',
          targetMetrics: {
            resistance: 25,
            cadence: 60,
            power: 80
          }
        },
        {
          id: 'interval_2',
          name: 'Interval 2',
          description: 'High intensity effort',
          duration: 120, // 2 minutes
          type: 'interval',
          targetMetrics: {
            resistance: 60,
            cadence: 90,
            power: 200
          }
        },
        {
          id: 'recovery_2',
          name: 'Recovery 2',
          description: 'Active recovery',
          duration: 180, // 3 minutes
          type: 'recovery',
          targetMetrics: {
            resistance: 25,
            cadence: 60,
            power: 80
          }
        },
        {
          id: 'interval_3',
          name: 'Interval 3',
          description: 'High intensity effort',
          duration: 120, // 2 minutes
          type: 'interval',
          targetMetrics: {
            resistance: 60,
            cadence: 90,
            power: 200
          }
        },
        {
          id: 'recovery_3',
          name: 'Recovery 3',
          description: 'Active recovery',
          duration: 180, // 3 minutes
          type: 'recovery',
          targetMetrics: {
            resistance: 25,
            cadence: 60,
            power: 80
          }
        },
        {
          id: 'interval_4',
          name: 'Interval 4',
          description: 'Final high intensity effort',
          duration: 120, // 2 minutes
          type: 'interval',
          targetMetrics: {
            resistance: 60,
            cadence: 90,
            power: 200
          }
        },
        {
          id: 'cooldown_int',
          name: 'Cool Down',
          description: 'Gradual cool down',
          duration: 375, // 6.25 minutes
          type: 'cooldown',
          targetMetrics: {
            resistance: 20,
            cadence: 55,
            power: 70
          }
        }
      ]
    },

    {
      id: 'template_pyramid',
      name: 'Pyramid Power',
      description: 'Progressive intensity pyramid workout',
      equipmentType: 'bike',
      difficulty: 4,
      tags: ['pyramid', 'power', 'advanced'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 2700, // 45 minutes
      steps: [
        {
          id: 'warmup_pyr',
          name: 'Warm-up',
          description: 'Thorough warm-up preparation',
          duration: 600, // 10 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 35,
            cadence: 75,
            power: 120
          }
        },
        {
          id: 'pyramid_1',
          name: 'Level 1',
          description: 'First pyramid level',
          duration: 180, // 3 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 45,
            cadence: 80,
            power: 160
          }
        },
        {
          id: 'pyramid_2',
          name: 'Level 2',
          description: 'Second pyramid level',
          duration: 240, // 4 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 55,
            cadence: 85,
            power: 200
          }
        },
        {
          id: 'pyramid_3',
          name: 'Level 3 (Peak)',
          description: 'Peak intensity',
          duration: 300, // 5 minutes
          type: 'interval',
          targetMetrics: {
            resistance: 70,
            cadence: 90,
            power: 250
          }
        },
        {
          id: 'pyramid_4',
          name: 'Level 2 (Down)',
          description: 'Coming down the pyramid',
          duration: 240, // 4 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 55,
            cadence: 85,
            power: 200
          }
        },
        {
          id: 'pyramid_5',
          name: 'Level 1 (Down)',
          description: 'Final pyramid level',
          duration: 180, // 3 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 45,
            cadence: 80,
            power: 160
          }
        },
        {
          id: 'cooldown_pyr',
          name: 'Extended Cool Down',
          description: 'Complete recovery',
          duration: 960, // 16 minutes
          type: 'cooldown',
          targetMetrics: {
            resistance: 25,
            cadence: 60,
            power: 90
          }
        }
      ]
    },

    // Advanced Templates
    {
      id: 'template_hiit_advanced',
      name: 'Advanced HIIT',
      description: 'High-intensity interval training for experienced cyclists',
      equipmentType: 'bike',
      difficulty: 5,
      tags: ['HIIT', 'advanced', 'intense'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 2400, // 40 minutes
      steps: [
        {
          id: 'warmup_hiit',
          name: 'Dynamic Warm-up',
          description: 'Progressive warm-up',
          duration: 600, // 10 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 40,
            cadence: 80,
            power: 140
          }
        },
        // Main HIIT block - repeat 6 times
        ...Array.from({ length: 6 }, (_, i) => [
          {
            id: `hiit_work_${i + 1}`,
            name: `HIIT Work ${i + 1}`,
            description: 'Maximum effort',
            duration: 60, // 1 minute
            type: 'interval' as const,
            targetMetrics: {
              resistance: 80,
              cadence: 100,
              power: 300
            }
          },
          {
            id: `hiit_rest_${i + 1}`,
            name: `HIIT Rest ${i + 1}`,
            description: 'Active recovery',
            duration: 120, // 2 minutes
            type: 'recovery' as const,
            targetMetrics: {
              resistance: 20,
              cadence: 50,
              power: 60
            }
          }
        ]).flat(),
        {
          id: 'cooldown_hiit',
          name: 'Extended Cool Down',
          description: 'Complete recovery',
          duration: 420, // 7 minutes
          type: 'cooldown',
          targetMetrics: {
            resistance: 15,
            cadence: 45,
            power: 50
          }
        }
      ]
    },

    // Endurance Template
    {
      id: 'template_endurance',
      name: 'Endurance Builder',
      description: '60-minute steady endurance ride',
      equipmentType: 'bike',
      difficulty: 3,
      tags: ['endurance', 'steady', 'long'],
      isTemplate: true,
      createdAt: now,
      modifiedAt: now,
      totalDuration: 3600, // 60 minutes
      steps: [
        {
          id: 'warmup_end',
          name: 'Extended Warm-up',
          description: 'Gradual intensity increase',
          duration: 900, // 15 minutes
          type: 'warmup',
          targetMetrics: {
            resistance: 30,
            cadence: 70,
            power: 110
          }
        },
        {
          id: 'main_end_1',
          name: 'Endurance Block 1',
          description: 'Steady aerobic effort',
          duration: 1200, // 20 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 45,
            cadence: 80,
            power: 160
          }
        },
        {
          id: 'main_end_2',
          name: 'Endurance Block 2',
          description: 'Maintain steady effort',
          duration: 1200, // 20 minutes
          type: 'steady',
          targetMetrics: {
            resistance: 45,
            cadence: 80,
            power: 160
          }
        },
        {
          id: 'cooldown_end',
          name: 'Cool Down',
          description: 'Gradual wind down',
          duration: 300, // 5 minutes
          type: 'cooldown',
          targetMetrics: {
            resistance: 20,
            cadence: 55,
            power: 80
          }
        }
      ]
    }
  ];
};

export const getTemplatesByDifficulty = (difficulty: number): WorkoutPlan[] => {
  return createWorkoutTemplates().filter(template => template.difficulty === difficulty);
};

export const getTemplatesByEquipment = (equipmentType: string): WorkoutPlan[] => {
  return createWorkoutTemplates().filter(template => template.equipmentType === equipmentType);
};

export const getTemplatesByTag = (tag: string): WorkoutPlan[] => {
  return createWorkoutTemplates().filter(template =>
    template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
};

export const searchTemplates = (query: string): WorkoutPlan[] => {
  const templates = createWorkoutTemplates();
  const lowercaseQuery = query.toLowerCase();

  return templates.filter(template =>
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};