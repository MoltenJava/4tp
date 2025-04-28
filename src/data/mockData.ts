import { faker } from '@faker-js/faker';
import { User, Location, NotificationPreferences } from '../models/User';
import { Representative, Chamber, ContactInfo, CommitteeMembership } from '../models/Representative';
import { Vote, VotePosition } from '../models/Vote';
import { Bill, BillStatus } from '../models/Bill';

// --- Generators ---

const generateMockLocation = (): Location => ({
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  zipCode: faker.location.zipCode(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
});

const generateMockNotificationPreferences = (repIds: string[]): NotificationPreferences => {
  const prefs: NotificationPreferences = {};
  repIds.forEach(id => {
    prefs[id] = {
      upcomingVotes: faker.datatype.boolean(),
      passedLegislation: faker.datatype.boolean(),
      breakingNews: faker.datatype.boolean(),
    };
  });
  return prefs;
};

const generateMockContactInfo = (): ContactInfo => ({
  email: faker.internet.email(),
  phone: faker.phone.number(),
  website: faker.internet.url(),
  socialMedia: {
    twitter: `@${faker.internet.userName()}`,
    facebook: faker.internet.url(),
  },
});

const generateMockCommitteeMembership = (): CommitteeMembership => ({
  id: `committee-${faker.string.uuid()}`,
  name: faker.company.catchPhraseNoun() + ' Committee',
  role: faker.helpers.arrayElement(['Member', 'Chair', 'Ranking Member', undefined]),
});


const generateMockRepresentative = (): Representative => {
  const id = `rep-${faker.string.uuid()}`;
  return {
    id: id,
    fullName: faker.person.fullName(),
    photoUrl: faker.image.avatar(),
    chamber: faker.helpers.arrayElement(['House', 'Senate']) ?? 'House',
    district: faker.helpers.maybe(() => faker.location.state({ abbreviated: true }) + '-' + faker.number.int({ min: 1, max: 53 }).toString()) ?? 'N/A',
    party: faker.helpers.arrayElement(['Democrat', 'Republican', 'Independent']) ?? 'Independent',
    bio: faker.lorem.paragraph() ?? 'Bio not available.',
    contactInfo: generateMockContactInfo(),
    committeeMemberships: faker.helpers.multiple(generateMockCommitteeMembership, { count: faker.number.int({ min: 1, max: 4 }) }),
  };
};

const generateMockBill = (sponsorIds: string[]): Bill => ({
  id: `bill-${faker.commerce.productName().toLowerCase().replace(/\s+/g, '-')}-${faker.number.int({ min: 1000, max: 9999 })}`,
  title: faker.company.catchPhrase(),
  summary: faker.lorem.sentences(2) ?? 'Summary not available.',
  fullTextUrl: faker.helpers.maybe(() => `https://congress.gov/bill/${faker.lorem.word()}/${faker.number.int({ min: 1000, max: 9999 })}`) ?? '#',
  scheduledDate: faker.helpers.maybe(() => faker.date.future().toISOString()),
  status: faker.helpers.arrayElement(['Introduced', 'In Committee', 'Scheduled', 'Passed', 'Failed', 'Became Law']) ?? 'Introduced',
  sponsorIds: sponsorIds.length > 0 ? faker.helpers.arrayElements(sponsorIds, faker.number.int({ min: 1, max: Math.min(3, sponsorIds.length) })) : [],
  topics: faker.helpers.multiple(() => faker.lorem.word(), { count: faker.number.int({ min: 1, max: 5 }) }),
});

const generateMockVote = (repId: string, billId: string, chamber: Chamber): Vote => ({
  id: `vote-${faker.string.uuid()}`,
  billId: billId,
  repId: repId,
  chamber: chamber,
  voteDate: faker.date.past().toISOString(),
  position: faker.helpers.arrayElement(['Yea', 'Nay', 'Abstain', 'Not Voting']) ?? 'Not Voting',
  summary: faker.lorem.sentence() ?? 'Summary not available.',
});

// --- Generated Data ---

export const mockRepresentatives: Representative[] = faker.helpers.multiple(generateMockRepresentative, { count: 10 });
const representativeIds = mockRepresentatives.map(r => r.id);

export const mockBills: Bill[] = faker.helpers.multiple(() => generateMockBill(representativeIds), { count: 20 });
const billIds = mockBills.map(b => b.id);

export const mockVotes: Vote[] = mockRepresentatives.flatMap(rep =>
  faker.helpers.arrayElements(billIds, faker.number.int({ min: 5, max: 15 })).map(billId =>
    generateMockVote(rep.id, billId, rep.chamber)
  )
);

// Generate a single mock user for simplicity
const mockFollowedReps = faker.helpers.arrayElements(representativeIds, faker.number.int({ min: 2, max: 5 }));
export const mockUser: User = {
  id: `user-${faker.string.uuid()}`,
  email: faker.internet.email(),
  location: generateMockLocation(),
  followedReps: mockFollowedReps,
  notificationPrefs: generateMockNotificationPreferences(mockFollowedReps),
};

console.log(`Generated ${mockRepresentatives.length} representatives.`);
console.log(`Generated ${mockBills.length} bills.`);
console.log(`Generated ${mockVotes.length} votes.`);
console.log(`Generated 1 user.`);
