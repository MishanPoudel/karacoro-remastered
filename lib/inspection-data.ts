export interface InspectionItem {
  id: string;
  name: string;
  description: string;
  condition: 'not-inspected' | 'good' | 'fair' | 'poor';
  notes: string;
  photos: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface InspectionCategory {
  id: string;
  name: string;
  description: string;
  items: InspectionItem[];
}

export interface InspectionData {
  id: string;
  theaterName: string;
  inspectorName: string;
  inspectionDate: string;
  productionStartDate: string;
  categories: InspectionCategory[];
}

export const inspectionCategories: InspectionCategory[] = [
  {
    id: 'stage-joints',
    name: 'Stage Joints & Connections',
    description: 'Comprehensive inspection of all stage platform connections, seams, and structural elements',
    items: [
      {
        id: 'platform-connections',
        name: 'Stage Platform Connections',
        description: 'Check all bolts, screws, and hardware connecting stage platforms',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'stage-seams',
        name: 'Seams Between Stage Sections',
        description: 'Inspect gaps, alignment, and stability between adjoining stage sections',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'risers-stairs',
        name: 'Risers and Stairs Stability',
        description: 'Test structural integrity and safety of all risers, steps, and stair units',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'load-bearing',
        name: 'Load-Bearing Capacity Testing',
        description: 'Verify weight capacity and structural soundness of critical support points',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'fasteners',
        name: 'Fastener Condition',
        description: 'Document condition of all visible bolts, screws, brackets, and mounting hardware',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'stage-surface',
        name: 'Stage Surface Condition',
        description: 'Check for warping, damage, splinters, or uneven surfaces on stage flooring',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'trap-doors',
        name: 'Trap Doors and Access Panels',
        description: 'Test operation and safety of any trap doors or removable stage panels',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      }
    ]
  },
  {
    id: 'infrastructure',
    name: 'Room Infrastructure',
    description: 'Complete assessment of building systems, safety equipment, and environmental controls',
    items: [
      {
        id: 'wall-condition',
        name: 'Wall Condition',
        description: 'Examine all walls for cracks, damage, water stains, or structural issues',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'electrical-outlets',
        name: 'Electrical Outlets and Circuits',
        description: 'Test all electrical outlets, verify proper grounding, and check circuit capacity',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'stage-lighting',
        name: 'Stage Lighting Systems',
        description: 'Verify proper function of all stage lights, dimmers, and control systems',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'hvac-systems',
        name: 'Ventilation and Temperature Control',
        description: 'Check HVAC operation, air circulation, and temperature regulation',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'emergency-exits',
        name: 'Emergency Exits and Signage',
        description: 'Inspect all emergency exits for proper operation and clear, visible signage',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'fire-safety',
        name: 'Fire Safety Equipment',
        description: 'Test fire extinguishers, smoke detectors, sprinkler systems, and alarm systems',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'acoustics',
        name: 'Acoustic Properties',
        description: 'Evaluate sound quality, echo, reverberation, and acoustic treatment effectiveness',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'ceiling-condition',
        name: 'Ceiling and Overhead Structure',
        description: 'Check ceiling tiles, beams, and overhead mounting points for damage or instability',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'flooring',
        name: 'Audience Area Flooring',
        description: 'Inspect carpet, tiles, or other flooring materials for trip hazards or damage',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      }
    ]
  },
  {
    id: 'technical-equipment',
    name: 'Technical Equipment',
    description: 'Thorough testing of all technical systems including sound, lighting, and rigging equipment',
    items: [
      {
        id: 'sound-system',
        name: 'Sound System Connections',
        description: 'Test all audio equipment, microphones, speakers, and mixing board functionality',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'lighting-board',
        name: 'Lighting Control Board',
        description: 'Verify proper operation of lighting control console and programming capabilities',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'rigging-points',
        name: 'Rigging Points and Weight Capacity',
        description: 'Inspect all rigging hardware, cables, and verify safe working load limits',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'curtain-tracks',
        name: 'Curtain Tracks and Mechanisms',
        description: 'Test operation of all curtains, scrims, and backdrop systems',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'communication-systems',
        name: 'Communication Systems',
        description: 'Test headset systems, backstage monitors, and crew communication equipment',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'follow-spots',
        name: 'Follow Spot Equipment',
        description: 'Check operation and positioning of follow spot lights and control systems',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'projection-equipment',
        name: 'Projection and Video Equipment',
        description: 'Test projectors, screens, and video playback systems if applicable',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'power-distribution',
        name: 'Power Distribution Systems',
        description: 'Inspect electrical panels, cable runs, and power distribution for technical equipment',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      },
      {
        id: 'safety-equipment',
        name: 'Technical Safety Equipment',
        description: 'Check safety cables, harnesses, and protective equipment for technical crew',
        condition: 'not-inspected',
        notes: '',
        photos: [],
        priority: 'low'
      }
    ]
  }
];