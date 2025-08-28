const { gql } = require("apollo-server");

const typeDefs = gql`
  type Service {
    id: ID!
    name: String!
  }

  type WorkExperience {
    jobTitle: String!
    company: String!
    startDate: String
    endDate: String
    description: String
  }

  type Education {
    degree: String!
    institution: String!
    year: Int
  }

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

  type Vacancy {
    id: ID!
    title: String!
    service: Service!
    employer: String!
    location: String
    createdAt: String!
  }

  type EmployerSummary {
    id: ID!
    name: String!
    taxId: String
    vacanciesOffered: Int!
  }

  type ServiceStat {
    serviceName: String!
    count: Int!
    percentage: Float!
  }

  type GenderStat {
    gender: String!
    count: Int!
  }

  type Query {
    employerSummary(id: ID!): EmployerSummary
    professionals: [Professional!]!
    vacancies: [Vacancy!]!
    applicantsByService(serviceId: ID!): [String!]!
    professionalsByServiceStats: [ServiceStat!]!
    professionalsByGender: [GenderStat!]!
    professional(id: ID!): Professional
    services: [Service!]!
  }

  input EmployerInput {
    type: String
    firstName: String
    lastName: String
    companyName: String
    taxId: String
  }

  input ProfessionalInput {
    firstName: String!
    lastName: String
    email: String
    gender: String
    taxId: String!
    services: [ID!]!
  }

  input WorkExperienceInput {
    jobTitle: String!
    company: String!
    startDate: String
    endDate: String
    description: String
  }

  input EducationInput {
    degree: String!
    institution: String!
    year: Int
  }

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