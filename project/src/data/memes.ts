// data/memes.ts

export interface Meme {
  id: string;
  url: string;
  title: string;
  tags?: string[]; // 👈 optional field for categories or filters
}

export const MEMES: Meme[] = [
  {
    id: '1',
    url: 'https://images.pexels.com/photos/5091121/pexels-photo-5091121.jpeg',
    title: 'Confused Cat',
    tags: ['cat', 'confused']
  },
  {
    id: '2',
    url: 'https://images.pexels.com/photos/3573382/pexels-photo-3573382.jpeg',
    title: 'Shocked Dog',
    tags: ['dog', 'surprised']
  },
  {
    id: '3',
    url: 'https://images.pexels.com/photos/1770918/pexels-photo-1770918.jpeg',
    title: 'Judgmental Bird',
    tags: ['bird', 'judgy']
  },
  {
    id: '4',
    url: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    title: 'Surprised Owl',
    tags: ['owl', 'surprised']
  },
  {
    id: '5',
    url: 'https://images.pexels.com/photos/1276553/pexels-photo-1276553.jpeg',
    title: 'Skeptical Dog',
    tags: ['dog', 'skeptic']
  },
  {
    id: '6',
    url: 'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg',
    title: 'Grumpy Cat',
    tags: ['cat', 'grumpy']
  },
  {
    id: '7',
    url: 'https://images.pexels.com/photos/39317/chihuahua-dog-puppy-cute-39317.jpeg',
    title: 'Worried Puppy',
    tags: ['dog', 'worried']
  },
  {
    id: '8',
    url: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg',
    title: 'Laughing Monkey',
    tags: ['monkey', 'laugh']
  },
  {
    id: '9',
    url: 'https://images.pexels.com/photos/2853130/pexels-photo-2853130.jpeg',
    title: 'Shocked Lemur',
    tags: ['lemur', 'shocked']
  },
  {
    id: '10',
    url: 'https://images.pexels.com/photos/1317844/pexels-photo-1317844.jpeg',
    title: 'Squinting Seal',
    tags: ['seal', 'suspicious']
  },
  {
    id: '11',
    url: 'https://images.pexels.com/photos/145939/pexels-photo-145939.jpeg',
    title: 'Determined Tiger',
    tags: ['tiger', 'motivated']
  },
  {
    id: '12',
    url: 'https://images.pexels.com/photos/1064729/pexels-photo-1064729.jpeg',
    title: 'Curious Raccoon',
    tags: ['raccoon', 'curious']
  },
  {
    id: '13',
    url: 'https://images.pexels.com/photos/1059823/pexels-photo-1059823.jpeg',
    title: 'Dramatic Llama',
    tags: ['llama', 'dramatic']
  },
  {
    id: '14',
    url: 'https://images.pexels.com/photos/1618606/pexels-photo-1618606.jpeg',
    title: 'Unimpressed Cow',
    tags: ['cow', 'meh']
  },
  {
    id: '15',
    url: 'https://images.pexels.com/photos/1076758/pexels-photo-1076758.jpeg',
    title: 'Disgusted Alpaca',
    tags: ['alpaca', 'disgusted']
  }
];
