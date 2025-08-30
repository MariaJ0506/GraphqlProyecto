const { gql } = require("apollo-server");

// GraphQL schema definitions
const typeDefs = gql`
  # Service entity
  type Service {
    id: ID!
    name: String!
  }

  # Work experience for a professional
  type WorkExperience {
    jobTitle: String!
    company: String!
    startDate: String
    endDate: String
    description: String
  }

  # Education background of a professional
  type Education {
    degree: String!
    institution: String!
    year: Int
  }

  # Professional entity
  type Professional {
    id: ID!
    firstName: String!
    lastName: String
    email: String
    gender: String
    taxId: String
    services: [Service!]!
    workExperience: [WorkExperience!]
    education: [Education!]
  }

  # Job vacancy entity
  type Vacancy {
    id: ID!
    title: String!
    service: Service!
    employer: String!
    location: String
    createdAt: String!
  }

  # Employer summary entity
  type EmployerSummary {
    id: ID!
    name: String!
    taxId: String
    vacanciesOffered: Int!
  }

  # Statistics of services
  type ServiceStat {
    serviceName: String!
    count: Int!
    percentage: Float!
  }

  # Statistics of professionals by gender
  type GenderStat {
    gender: String!
    count: Int!
  }

  # Applicants grouped by service
  type ApplicantsByServiceResult {
    serviceName: String!
    applicants: [String!]!
  }

  # Root query definitions
  type Query {
    employerSummary(id: ID!): EmployerSummary
    professionals: [Professional!]!
    vacancies: [Vacancy!]!
    applicantsByService(serviceId: ID!): ApplicantsByServiceResult!
    professionalsByServiceStats: [ServiceStat!]!
    professionalsByGender: [GenderStat!]!
    professional(id: ID!): Professional
    services: [Service!]!
  }

  # Input type for employer registration
  input EmployerInput {
    type: String
    firstName: String
    lastName: String
    companyName: String
    taxId: String
  }

  # Input type for professional registration
  input ProfessionalInput {
    firstName: String!
    lastName: String
    email: String
    gender: String
    taxId: String!
    services: [ID!]!
  }

  # Input type for work experience
  input WorkExperienceInput {
    jobTitle: String!
    company: String!
    startDate: String
    endDate: String
    description: String
  }

  # Input type for education
  input EducationInput {
    degree: String!
    institution: String!
    year: Int
  }

  # Root mutation definitions
  type Mutation {
    createService(name: String!): Service!
    registerEmployer(data: EmployerInput!): EmployerSummary!
    registerProfessional(data: ProfessionalInput!): Professional!
    assignServicesToProfessional(professionalId: ID!, serviceIds: [ID!]!): Boolean!
    applyToVacancy(professionalId: ID!, vacancyId: ID!): Boolean!
    addWorkExperience(professionalId: ID!, experience: WorkExperienceInput!): Professional!
    addEducation(professionalId: ID!, education: EducationInput!): Professional!
    createVacancy(title: String!, serviceId: ID!, employerId: ID!, location: String): Vacancy!
  }
`;

module.exports = typeDefs;
