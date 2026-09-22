import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SKILL_POOL = [
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "Python",
  "Django",
  "SQL",
  "PostgreSQL",
  "AWS",
  "Docker",
  "Kubernetes",
  "Java",
  "Spring Boot",
  "Angular",
  "Vue.js",
  "GraphQL",
  "MongoDB",
  "Redis",
  "CI/CD",
  "Machine Learning",
  "Data Analysis",
  "Excel",
  "Communication",
  "Project Management",
  "Sales",
  "Recruiting",
  "HTML/CSS",
  "REST APIs",
  "Golang",
  "C#",
].map((name) => name.toLowerCase());

const LOCATIONS = ["Bangalore", "Mumbai", "Delhi NCR", "Pune", "Remote", "New York", "London", "Hyderabad"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function pickOne<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)] as T;
}

function displayCase(skill: string): string {
  return skill
    .split(" ")
    .map((w) => (w.length <= 3 && w === w.toLowerCase() ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");
}

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditi", "Diya", "Kabir", "Meera", "Rohan", "Sana",
  "Ishaan", "Priya", "Arjun", "Neha", "Karan", "Riya", "Dev", "Anaya",
  "Sameer", "Tara", "Yash", "Zara", "Nikhil", "Pooja", "Rahul", "Simran",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Nair", "Gupta", "Kapoor", "Reddy", "Menon",
  "Singh", "Patel", "Rao", "Chopra", "Joshi", "Malhotra", "Bose", "Pillai",
];

function randomName(): string {
  return `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}`;
}

const JOB_TITLES = [
  { title: "Senior Frontend Engineer", skills: ["react", "typescript", "javascript", "html/css", "rest apis"] },
  { title: "Backend Engineer (Node)", skills: ["node.js", "typescript", "postgresql", "docker", "rest apis"] },
  { title: "Full Stack Developer", skills: ["react", "node.js", "sql", "aws", "typescript"] },
  { title: "DevOps Engineer", skills: ["docker", "kubernetes", "aws", "ci/cd", "golang"] },
  { title: "Data Analyst", skills: ["python", "sql", "excel", "data analysis", "machine learning"] },
  { title: "Java Backend Developer", skills: ["java", "spring boot", "sql", "rest apis", "docker"] },
  { title: "Recruitment Coordinator", skills: ["recruiting", "communication", "excel", "project management"] },
  { title: "Sales Development Rep", skills: ["sales", "communication", "excel"] },
];

const CLIENTS = ["Acme Corp", "Globex", "Initech", "Umbrella Inc", "Stark Industries", "Wayne Enterprises", null];

async function main() {
  console.log("Clearing existing data...");
  // The tenant-owned tables are protected by row-level security, which would make a
  // deleteMany() with no tenant context delete nothing. TRUNCATE isn't row-filtered.
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE audit_logs, interviews, submissions, job_order_required_skills, candidate_skills, job_orders, candidates"
  );
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("Creating skills...");
  await prisma.skill.createMany({ data: SKILL_POOL.map((name) => ({ name })) });
  const skills = await prisma.skill.findMany();
  const skillByName = new Map(skills.map((s) => [s.name, s]));

  const tenantNames = ["LinkedIn", "Monster", "Naukri"];

  for (const tenantName of tenantNames) {
    console.log(`Seeding tenant: ${tenantName}`);
    const tenant = await prisma.tenant.create({ data: { name: tenantName } });

    // Tenant-owned rows are protected by row-level security: create them AS this tenant.
    await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;

    const candidateCount = randomInt(10, 14);
    const candidateSkillSets: string[][] = [];

    for (let i = 0; i < candidateCount; i++) {
      const skillCount = randomInt(3, 7);
      const candidateSkills = pickRandom(SKILL_POOL, skillCount);
      candidateSkillSets.push(candidateSkills);

      await tx.candidate.create({
        data: {
          tenantId: tenant.id,
          fullName: randomName(),
          email: `candidate${i}.${tenant.name.toLowerCase()}@example.com`,
          phone: `+91 9${randomInt(100000000, 999999999)}`,
          location: pickOne(LOCATIONS),
          experienceYears: randomInt(1, 12),
          skills: {
            create: candidateSkills.map((name) => ({ skillId: skillByName.get(name)!.id })),
          },
        },
      });
    }

    const jobOrderCount = randomInt(3, 4);
    const jobOrderTemplates = pickRandom(JOB_TITLES, jobOrderCount);

    for (const template of jobOrderTemplates) {
      await tx.jobOrder.create({
        data: {
          tenantId: tenant.id,
          title: template.title,
          clientName: pickOne(CLIENTS),
          location: pickOne(LOCATIONS),
          minExperience: randomInt(1, 5),
          numberOfOpenings: randomInt(1, 3),
          requiredSkills: {
            create: template.skills.map((name) => ({ skillId: skillByName.get(name)!.id })),
          },
        },
      });
    }
    }, { timeout: 120_000 });
  }

  // Demo logins (local/demo data only; real accounts come from `npm run create-user`).
  // The recruiter is deliberately NOT a member of Naukri, so tenant isolation is visible.
  const tenants = await prisma.tenant.findMany();
  const demoUsers = [
    { email: "admin@talentfinder.demo", name: "Asha Admin", password: "Admin@12345", tenants: tenantNames, role: "ADMIN" as const },
    { email: "recruiter@talentfinder.demo", name: "Ravi Recruiter", password: "Recruit@12345", tenants: ["LinkedIn", "Monster"], role: "RECRUITER" as const },
  ];
  for (const demo of demoUsers) {
    const user = await prisma.user.create({
      data: { email: demo.email, name: demo.name, passwordHash: await bcrypt.hash(demo.password, 12) },
    });
    for (const tenant of tenants.filter((t) => demo.tenants.includes(t.name))) {
      await prisma.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: demo.role } });
    }
    console.log(`Demo login: ${demo.email} / ${demo.password} (${demo.role}: ${demo.tenants.join(", ")})`);
  }

  console.log("Seed complete.");
  console.log(`Tenants: ${tenantNames.join(", ")}`);
  console.log(`Skills seeded: ${SKILL_POOL.map(displayCase).length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
