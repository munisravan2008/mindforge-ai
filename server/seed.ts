import bcrypt from 'bcryptjs';
import { db, User } from './db.js';

export const DEMO_USER_ID = 'user-demo-mindforge-001';
export const DEMO_SOURCE_ID = 'source-demo-bio-101';
export const DEMO_DECK_ID = 'deck-demo-bio-flashcards';
export const DEMO_QUIZ_ID = 'quiz-demo-bio-respiration';
export const DEMO_CONV_ID = 'conv-demo-bio-tutor';
export const DEMO_NOTE_ID = 'note-demo-bio-summary';

export async function ensureDemoData() {
  const existingUser = db.users.find(u => u.id === DEMO_USER_ID || u.email === 'demo@mindforge.ai');
  
  if (existingUser) {
    const demoActs = db.studyActivity.filter(a => a.userId === DEMO_USER_ID);
    if (demoActs.length < 20) {
      for (let i = 29; i >= 0; i--) {
        const actDate = new Date(Date.now() - i * 86400000).toISOString();
        const isRestDay = i % 7 === 5 && i > 3;
        if (!isRestDay) {
          db.studyActivity.push({
            id: `act-demo-backfill-${i}-1`,
            userId: DEMO_USER_ID,
            activityType: 'flashcard_review',
            metadata: { cardsReviewed: 8 + (i % 4) * 3, deckTitle: 'Cellular Respiration Mastery Cards' },
            durationSeconds: 360 + (30 - i) * 35 + (i % 5) * 60,
            createdAt: actDate,
          });

          if (i % 3 === 0 || i === 1) {
            db.studyActivity.push({
              id: `act-demo-backfill-${i}-2`,
              userId: DEMO_USER_ID,
              activityType: 'quiz_completed',
              metadata: { score: Math.min(100, 60 + Math.floor((30 - i) * 1.3)), quizTitle: 'Cellular Energetics Exam' },
              durationSeconds: 300 + (i % 4) * 45,
              createdAt: actDate,
            });
          }
        }
      }
      db.save();
    }
    return existingUser;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('mindforge123', salt);
  const now = new Date().toISOString();

  // 1. Create Demo User
  const demoUser: User = {
    id: DEMO_USER_ID,
    email: 'demo@mindforge.ai',
    passwordHash,
    name: 'Alex Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'user',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: now,
  };
  db.users.push(demoUser);

  // 2. Preferences
  db.userPreferences.push({
    userId: DEMO_USER_ID,
    preferredLanguage: 'English',
    learningGoal: 'college',
    studyMethods: ['flashcards', 'quizzes', 'tutor'],
    defaultDifficulty: 'medium',
    defaultQuizQuestionCount: 5,
    theme: 'dark',
  });

  // 3. Collection
  const collectionId = 'col-demo-biology';
  db.collections.push({
    id: collectionId,
    userId: DEMO_USER_ID,
    name: 'Cell Biology & Biochemistry',
    description: 'Lecture materials, cellular energetics, and metabolic pathways.',
    color: '#6366f1',
    icon: 'FolderHeart',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: now,
  });

  // 4. Sample Source
  const sourceText = `Cellular Respiration and Energy Production
Overview of Metabolic Energetics

Page 1: Glycolysis
Cellular respiration is the biochemical pathway through which cells break down glucose to generate adenosine triphosphate (ATP), the universal chemical energy currency of all living organisms. The overall stoichiometric equation for aerobic respiration is:
C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + approximately 30-32 ATP.

Glycolysis takes place in the cytoplasm (cytosol) of eukaryotic cells and is an anaerobic process, meaning it does not directly require molecular oxygen. During glycolysis, a six-carbon molecule of glucose undergoes ten enzymatic steps, yielding two three-carbon molecules of pyruvate, a net gain of 2 ATP molecules (via substrate-level phosphorylation), and 2 molecules of NADH. Glycolysis consists of two main phases: the energy investment phase (which consumes 2 ATP) and the energy payoff phase (producing 4 ATP and 2 NADH).

Page 2: The Citric Acid Cycle (Krebs Cycle)
In the presence of oxygen, pyruvate produced in the cytoplasm is transported into the mitochondrial matrix. Here, the pyruvate dehydrogenase multi-enzyme complex catalyzes pyruvate oxidation, converting each pyruvate into Acetyl-CoA, releasing one molecule of carbon dioxide (CO2) and generating 1 NADH. Because one glucose yields two pyruvates, this transition produces 2 Acetyl-CoA, 2 CO2, and 2 NADH.

Acetyl-CoA subsequently enters the Citric Acid Cycle (also known as the Krebs cycle or Tricarboxylic Acid cycle). In the first reaction, oxaloacetate (4 carbons) condenses with acetyl-CoA (2 carbons) to form citrate (6 carbons). Over eight enzymatic reactions, citrate is oxidized back into oxaloacetate. Per turn of the cycle (per Acetyl-CoA), 3 NADH, 1 FADH2, 1 ATP (or GTP), and 2 CO2 molecules are produced. For one full glucose molecule, the citric acid cycle generates 6 NADH, 2 FADH2, 2 ATP, and 4 CO2.

Page 3: The Electron Transport Chain and Chemiosmosis
The culmination of aerobic respiration occurs at the inner mitochondrial membrane, where oxidative phosphorylation takes place. The Electron Transport Chain (ETC) comprises four large multi-protein complexes (Complex I, II, III, and IV) plus mobile electron carriers (ubiquinone/coenzyme Q and cytochrome c). High-energy electrons donated by NADH and FADH2 traverse these complexes in a series of exergonic redox reactions, ultimately being accepted by molecular oxygen (O2) along with protons to produce water (H2O).

As electrons travel through Complexes I, III, and IV, protons (H+) are actively pumped from the mitochondrial matrix across the inner membrane into the intermembrane space. This creates an electrochemical proton gradient termed the proton-motive force (PMF).

Page 4: ATP Synthase and ATP Yield
The proton-motive force drives protons back down their electrochemical gradient into the matrix through a magnificent rotary molecular machine called ATP Synthase (Complex V). As protons pass through the F0 rotor subunit, conformational changes are induced in the F1 catalytic head, phosphorylating ADP and inorganic phosphate (Pi) into ATP. This mechanism was formulated by Peter Mitchell in his Chemiosmotic Hypothesis (Nobel Prize, 1978).

Each NADH yields approximately 2.5 ATP, while each FADH2 yields approximately 1.5 ATP because its electrons enter at Complex II downstream. The total theoretical yield of aerobic respiration from one mole of glucose is 30 to 32 ATP under optimal conditions. In contrast, under anaerobic conditions, cells must rely on fermentation (lactic acid or ethanol) to regenerate NAD+ from NADH so that glycolysis can continue, yielding only a meager 2 ATP per glucose.`;

  db.sources.push({
    id: DEMO_SOURCE_ID,
    userId: DEMO_USER_ID,
    title: 'Cellular Respiration & Energy Production (Bio 101)',
    type: 'pdf',
    originalFilename: 'Cellular_Respiration_Mechanisms.pdf',
    fileSize: 421800,
    mimeType: 'application/pdf',
    processingStatus: 'ready',
    summary: 'Comprehensive academic study module detailing the four stages of aerobic cellular respiration: Glycolysis in the cytosol, Pyruvate Oxidation, the Citric Acid (Krebs) Cycle in the mitochondrial matrix, and Oxidative Phosphorylation (Electron Transport Chain and Chemiosmosis) driven by ATP Synthase along the inner mitochondrial membrane.',
    topicOutline: [
      'Glycolysis & Substrate-Level Phosphorylation',
      'Pyruvate Oxidation & Acetyl-CoA Formation',
      'Citric Acid (Krebs) Cycle Reactions & Yield',
      'Electron Transport Chain & Proton-Motive Force',
      'Chemiosmosis & ATP Synthase Mechanism',
      'Aerobic Yield vs. Anaerobic Fermentation'
    ],
    keyConcepts: [
      { term: 'Cellular Respiration', definition: 'The catabolic process by which chemical energy in organic molecules (glucose) is converted into usable ATP.' },
      { term: 'Substrate-Level Phosphorylation', definition: 'Direct enzymatic transfer of a phosphate group from an organic substrate to ADP to form ATP.' },
      { term: 'Proton-Motive Force (PMF)', definition: 'The electrochemical gradient across the inner mitochondrial membrane generated by proton pumping.' },
      { term: 'ATP Synthase (Complex V)', definition: 'A rotary enzyme complex that utilizes proton flux down their gradient to synthesize ATP from ADP and inorganic phosphate.' }
    ],
    definitions: [
      { term: 'Chemiosmosis', definition: 'The movement of ions across a semipermeable membrane down their electrochemical gradient, coupled to ATP synthesis.', context: 'Page 3-4' },
      { term: 'Oxidative Phosphorylation', definition: 'The metabolic pathway in which cells use enzymes to oxidize nutrients, releasing chemical energy used to produce ATP via the ETC.', context: 'Page 3' },
      { term: 'Fermentation', definition: 'An anaerobic pathway allowing glycolysis to continue by regenerating NAD+ without molecular oxygen.', context: 'Page 4' }
    ],
    wordCount: 654,
    chunkCount: 4,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: now,
  });

  db.collectionSources.push({
    id: 'cs-demo-1',
    collectionId,
    sourceId: DEMO_SOURCE_ID,
    addedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  });

  // 5. Source Chunks with citations
  db.sourceChunks.push(
    {
      id: 'chunk-demo-1',
      sourceId: DEMO_SOURCE_ID,
      chunkIndex: 0,
      pageNumber: 1,
      heading: 'Glycolysis & Cytosolic ATP Synthesis',
      content: 'Cellular respiration converts glucose into ATP. Overall equation: C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + 30-32 ATP. Glycolysis occurs in the cytoplasm and is anaerobic. It converts 1 glucose into 2 pyruvate, generating a net of 2 ATP and 2 NADH via substrate-level phosphorylation.',
      tokenCount: 65,
      createdAt: now,
    },
    {
      id: 'chunk-demo-2',
      sourceId: DEMO_SOURCE_ID,
      chunkIndex: 1,
      pageNumber: 2,
      heading: 'Pyruvate Oxidation and Citric Acid Cycle',
      content: 'Pyruvate enters mitochondrial matrix and is converted to Acetyl-CoA by pyruvate dehydrogenase, releasing CO2 and making 1 NADH per pyruvate (2 per glucose). Acetyl-CoA joins oxaloacetate to form citrate. Krebs cycle produces 3 NADH, 1 FADH2, 1 ATP (or GTP), and 2 CO2 per turn (doubled per glucose).',
      tokenCount: 78,
      createdAt: now,
    },
    {
      id: 'chunk-demo-3',
      sourceId: DEMO_SOURCE_ID,
      chunkIndex: 2,
      pageNumber: 3,
      heading: 'Electron Transport Chain and Proton Pumping',
      content: 'Inner mitochondrial membrane houses Complex I, II, III, and IV plus ubiquinone and cytochrome c. Electrons from NADH and FADH2 flow down redox gradients to O2, forming water. Complexes I, III, and IV pump protons into the intermembrane space, creating the proton-motive force.',
      tokenCount: 72,
      createdAt: now,
    },
    {
      id: 'chunk-demo-4',
      sourceId: DEMO_SOURCE_ID,
      chunkIndex: 3,
      pageNumber: 4,
      heading: 'ATP Synthase Rotary Mechanism and Energetic Yield',
      content: 'Protons flow through ATP Synthase (Complex V) back into the matrix. The rotary motion phosphorylates ADP to ATP (Mitchell\'s Chemiosmotic Hypothesis). 1 NADH yields ~2.5 ATP; 1 FADH2 yields ~1.5 ATP. Total aerobic yield is ~30-32 ATP vs only 2 ATP in anaerobic fermentation.',
      tokenCount: 70,
      createdAt: now,
    }
  );

  // 6. Flashcard Deck
  db.flashcardDecks.push({
    id: DEMO_DECK_ID,
    userId: DEMO_USER_ID,
    sourceId: DEMO_SOURCE_ID,
    collectionId,
    title: 'Cellular Respiration Mastery Cards',
    description: 'High-yield conceptual and quantitative flashcards covering metabolic pathways, ATP stoichiometry, and ATP synthase.',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: now,
  });

  const cardsData = [
    {
      front: 'Where in the eukaryotic cell does glycolysis occur, and does it require oxygen?',
      back: 'Cytoplasm (cytosol). It is anaerobic and does not require oxygen.',
      explanation: 'Glycolysis is conserved across nearly all life forms and occurs outside the mitochondria.',
      sourceReference: 'Page 1: Glycolysis',
      pageNumber: 1,
      reviewState: 'known' as const,
      repetitionLevel: 2,
    },
    {
      front: 'What is the net gain of ATP and NADH per single glucose molecule from glycolysis alone?',
      back: 'Net 2 ATP and 2 NADH (plus 2 Pyruvate molecules).',
      explanation: '4 ATP are produced in the payoff phase, but 2 ATP are consumed during the initial investment phase.',
      sourceReference: 'Page 1: Glycolysis',
      pageNumber: 1,
      reviewState: 'known' as const,
      repetitionLevel: 2,
    },
    {
      front: 'What molecule does oxaloacetate (4C) condense with to form citrate (6C) in the Krebs Cycle?',
      back: 'Acetyl-CoA (2-carbon acetyl group).',
      explanation: 'Coenzyme A is released upon condensation, leaving citrate to be oxidized through 8 enzymatic steps.',
      sourceReference: 'Page 2: The Citric Acid Cycle',
      pageNumber: 2,
      reviewState: 'known' as const,
      repetitionLevel: 1,
    },
    {
      front: 'Which multi-protein complexes in the Electron Transport Chain actively pump protons across the inner membrane?',
      back: 'Complexes I, III, and IV.',
      explanation: 'Complex II (succinate dehydrogenase) accepts electrons from FADH2 but does not pump protons into the intermembrane space.',
      sourceReference: 'Page 3: Electron Transport Chain',
      pageNumber: 3,
      reviewState: 'needs_review' as const,
      repetitionLevel: 0,
    },
    {
      front: 'What is the final electron acceptor in aerobic cellular respiration, and what product does it form?',
      back: 'Molecular Oxygen (O2), which accepts electrons and protons to form Water (H2O).',
      explanation: 'Without oxygen, electrons back up in the ETC, stopping proton pumping and oxidative phosphorylation.',
      sourceReference: 'Page 3: Electron Transport Chain',
      pageNumber: 3,
      reviewState: 'known' as const,
      repetitionLevel: 3,
    },
    {
      front: 'How many ATP molecules are generated per NADH versus per FADH2 in oxidative phosphorylation?',
      back: 'Approximately 2.5 ATP per NADH, and 1.5 ATP per FADH2.',
      explanation: 'FADH2 donates electrons to Complex II rather than Complex I, missing the first proton-pumping site.',
      sourceReference: 'Page 4: ATP Synthase and ATP Yield',
      pageNumber: 4,
      reviewState: 'known' as const,
      repetitionLevel: 2,
    },
    {
      front: 'Who formulated the Chemiosmotic Hypothesis explaining ATP synthesis via proton-motive force?',
      back: 'Peter Mitchell (Nobel Prize in Chemistry, 1978).',
      explanation: 'His model overturned prior high-energy chemical intermediate theories by proving electrical & pH gradients drive ATP synthase.',
      sourceReference: 'Page 4: Chemiosmosis',
      pageNumber: 4,
      reviewState: 'known' as const,
      repetitionLevel: 1,
    },
    {
      front: 'Why do cells undergo fermentation under anaerobic conditions if it generates no additional ATP?',
      back: 'To regenerate NAD+ from NADH so that glycolysis can continue operating.',
      explanation: 'Glycolysis requires NAD+ as an electron acceptor. Fermentation dumps electrons onto pyruvate/acetaldehyde.',
      sourceReference: 'Page 4: Fermentation',
      pageNumber: 4,
      reviewState: 'known' as const,
      repetitionLevel: 2,
    },
  ];

  cardsData.forEach((c, idx) => {
    db.flashcards.push({
      id: `card-demo-${idx + 1}`,
      deckId: DEMO_DECK_ID,
      front: c.front,
      back: c.back,
      explanation: c.explanation,
      sourceReference: c.sourceReference,
      pageNumber: c.pageNumber,
      reviewState: c.reviewState,
      repetitionLevel: c.repetitionLevel,
      nextReviewDate: c.reviewState === 'needs_review' ? new Date().toISOString() : new Date(Date.now() + (idx + 1) * 86400000).toISOString(),
      lastReviewedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: now,
    });
  });

  // 7. Sample Quiz
  db.quizzes.push({
    id: DEMO_QUIZ_ID,
    userId: DEMO_USER_ID,
    sourceId: DEMO_SOURCE_ID,
    collectionId,
    title: 'Cellular Energetics & Oxidative Phosphorylation Exam',
    difficulty: 'medium',
    timerSeconds: 300,
    mode: 'assessment',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  });

  const questionsData = [
    {
      questionText: 'Where does Glycolysis take place in a eukaryotic cell?',
      questionType: 'mcq' as const,
      options: ['Mitochondrial matrix', 'Cytoplasm (Cytosol)', 'Inner mitochondrial membrane', 'Nucleus'],
      correctAnswer: 'Cytoplasm (Cytosol)',
      explanation: 'Glycolysis occurs in the cytosol without requiring organelles or molecular oxygen.',
      sourceReference: 'Page 1: Glycolysis',
      pageNumber: 1,
      topic: 'Glycolysis',
      questionOrder: 0,
    },
    {
      questionText: 'The Electron Transport Chain Complex II pumps protons into the intermembrane space.',
      questionType: 'true_false' as const,
      options: ['True', 'False'],
      correctAnswer: 'False',
      explanation: 'Complex II (succinate dehydrogenase) transfers electrons from FADH2 to coenzyme Q, but unlike Complexes I, III, and IV, does not pump protons.',
      sourceReference: 'Page 3: Electron Transport Chain',
      pageNumber: 3,
      topic: 'Electron Transport Chain',
      questionOrder: 1,
    },
    {
      questionText: 'What is the theoretical maximum net ATP yield per glucose molecule during complete aerobic respiration?',
      questionType: 'mcq' as const,
      options: ['2 ATP', '12-14 ATP', '30-32 ATP', '38-40 ATP'],
      correctAnswer: '30-32 ATP',
      explanation: 'Under modern P/O ratio measurements (2.5 ATP/NADH and 1.5 ATP/FADH2), the net yield is ~30 to 32 ATP.',
      sourceReference: 'Page 4: ATP Yield',
      pageNumber: 4,
      topic: 'Bioenergetics',
      questionOrder: 2,
    },
    {
      questionText: 'The rotary molecular machine responsible for synthesizing ATP using the proton-motive force is called ATP _______.',
      questionType: 'fill_blank' as const,
      options: [],
      correctAnswer: 'Synthase',
      explanation: 'ATP Synthase (Complex V) couples proton movement to the phosphorylation of ADP + Pi into ATP.',
      sourceReference: 'Page 4: ATP Synthase',
      pageNumber: 4,
      topic: 'Chemiosmosis',
      questionOrder: 3,
    },
    {
      questionText: 'Explain the primary purpose of cellular fermentation in the absence of oxygen.',
      questionType: 'short_answer' as const,
      options: [],
      correctAnswer: 'To regenerate NAD+ from NADH so that glycolysis can continue to generate ATP.',
      explanation: 'Under anaerobic conditions, fermentation oxidizes NADH back to NAD+, preventing glycolysis from halting.',
      sourceReference: 'Page 4: Fermentation',
      pageNumber: 4,
      topic: 'Fermentation',
      questionOrder: 4,
    },
  ];

  questionsData.forEach((q, idx) => {
    db.quizQuestions.push({
      id: `qq-demo-${idx + 1}`,
      quizId: DEMO_QUIZ_ID,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      sourceReference: q.sourceReference,
      pageNumber: q.pageNumber,
      topic: q.topic,
      questionOrder: q.questionOrder,
    });
  });

  // Past Quiz Attempt for analytics
  const attemptId = 'attempt-demo-1';
  db.quizAttempts.push({
    id: attemptId,
    quizId: DEMO_QUIZ_ID,
    userId: DEMO_USER_ID,
    startedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 86400000 + 195000).toISOString(),
    totalQuestions: 5,
    score: 4,
    percentage: 80,
    timeTakenSeconds: 195,
  });

  // 8. Tutor Conversation with Grounded Citations
  db.tutorConversations.push({
    id: DEMO_CONV_ID,
    userId: DEMO_USER_ID,
    sourceId: DEMO_SOURCE_ID,
    collectionId,
    title: 'Oxidative Phosphorylation & ATP Synthase Inquiry',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: now,
  });

  db.chatMessages.push(
    {
      id: 'msg-demo-1',
      conversationId: DEMO_CONV_ID,
      role: 'user',
      content: 'Can you explain how ATP Synthase works and what drives its rotation?',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'msg-demo-2',
      conversationId: DEMO_CONV_ID,
      role: 'assistant',
      content: `**ATP Synthase (Complex V)** operates as a remarkable rotary nanomachine powered by the **proton-motive force (PMF)** across the inner mitochondrial membrane [1].

### Mechanical Operation:
1. **Electrochemical Gradient**: Complexes I, III, and IV of the Electron Transport Chain actively pump protons into the intermembrane space, creating both a voltage gradient and a pH gradient [2].
2. **Proton Translocation**: Protons can only diffuse back into the mitochondrial matrix through the stator and rotor subunits ($F_0$ rotor) of ATP Synthase.
3. **Conformation Changes**: As protons flow through, the central axle rotates within the catalytic $F_1$ head, sequentially changing the binding affinities of three active sites to synthesize **ATP from ADP and inorganic phosphate ($P_i$)** [1].
4. **Theoretical Yield**: Each NADH creates enough proton gradient to produce approximately **2.5 ATP**, whereas FADH2 yields **1.5 ATP** [1].

*Note: AI-generated answers can contain inaccuracies; please cross-verify with your course materials.*`,
      citations: [
        {
          chunkId: 'chunk-demo-4',
          sourceTitle: 'Cellular Respiration & Energy Production (Bio 101)',
          pageNumber: 4,
          quote: 'The proton-motive force drives protons back down their electrochemical gradient into the matrix through a magnificent rotary molecular machine called ATP Synthase (Complex V).'
        },
        {
          chunkId: 'chunk-demo-3',
          sourceTitle: 'Cellular Respiration & Energy Production (Bio 101)',
          pageNumber: 3,
          quote: 'As electrons travel through Complexes I, III, and IV, protons (H+) are actively pumped from the mitochondrial matrix across the inner membrane into the intermembrane space.'
        }
      ],
      suggestedFollowUps: [
        'Why does FADH2 yield fewer ATP molecules than NADH?',
        'What happens to ATP synthesis if an uncoupler chemical is added?',
        'How does fermentation regenerate NAD+ when oxygen is depleted?'
      ],
      createdAt: new Date(Date.now() - 2 * 86400000 + 4000).toISOString(),
    }
  );

  // 9. Study Notes
  db.studyNotes.push({
    id: DEMO_NOTE_ID,
    userId: DEMO_USER_ID,
    sourceId: DEMO_SOURCE_ID,
    title: 'High-Yield Revision Notes: Cellular Energetics',
    formatType: 'exam_revision',
    content: `# High-Yield Revision Guide: Cellular Respiration

## 1. Stoichiometry Summary
- **Overall Equation**: $\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 30\\text{-}32\\text{ ATP}$
- **Glycolysis**: Cytosol | Anaerobic | Net 2 ATP + 2 NADH + 2 Pyruvate
- **Pyruvate Oxidation**: Matrix | 2 Pyruvate $\\rightarrow$ 2 Acetyl-CoA + 2 CO2 + 2 NADH
- **Krebs Cycle**: Matrix | 2 Turns per Glucose $\\rightarrow$ 4 CO2 + 6 NADH + 2 FADH2 + 2 ATP
- **Oxidative Phosphorylation**: Inner Membrane | 1 NADH $\\approx$ 2.5 ATP, 1 FADH2 $\\approx$ 1.5 ATP

## 2. Key Regulators
- **Phosphofructokinase-1 (PFK-1)**: Rate-limiting enzyme of glycolysis. Inhibited by ATP and citrate; activated by AMP and fructose-2,6-bisphosphate.
- **Isocitrate Dehydrogenase**: Key control point of the Krebs cycle.

## 3. Critical Exam Distinctions
- **Substrate-level phosphorylation** directly attaches phosphate from substrate to ADP (Glycolysis & Krebs).
- **Oxidative phosphorylation** relies on the electrochemical gradient generated by redox reactions in the Electron Transport Chain.`,
    sections: [
      { heading: 'Stoichiometry Summary', body: 'Breakdown of net yields across each metabolic stage.' },
      { heading: 'Key Regulators', body: 'Allosteric enzyme control points in glycolysis and Krebs cycle.' },
      { heading: 'Critical Exam Distinctions', body: 'Differences between substrate-level and oxidative phosphorylation.' }
    ],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: now,
  });

  // 10. Study Activity History (Over 30 days for rich analytics charts)
  for (let i = 29; i >= 0; i--) {
    const actDate = new Date(Date.now() - i * 86400000).toISOString();
    // Simulate active days with natural study cadence (weekdays vs weekends)
    const isRestDay = i % 7 === 5 && i > 3;
    if (!isRestDay) {
      db.studyActivity.push({
        id: `act-demo-${i}-1`,
        userId: DEMO_USER_ID,
        activityType: 'flashcard_review',
        metadata: { cardsReviewed: 8 + (i % 4) * 3, deckTitle: 'Cellular Respiration Mastery Cards' },
        durationSeconds: 360 + (30 - i) * 35 + (i % 5) * 60,
        createdAt: actDate,
      });

      if (i % 3 === 0 || i === 1) {
        db.studyActivity.push({
          id: `act-demo-${i}-2`,
          userId: DEMO_USER_ID,
          activityType: 'quiz_completed',
          metadata: { score: Math.min(100, 60 + Math.floor((30 - i) * 1.3)), quizTitle: 'Cellular Energetics Exam' },
          durationSeconds: 300 + (i % 4) * 45,
          createdAt: actDate,
        });
      }
    }
  }

  db.save();
  return demoUser;
}
