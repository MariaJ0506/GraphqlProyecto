const { ObjectId } = require("mongodb");
const { UserInputError } = require("apollo-server");

const resolvers = {
  Query: {
    async professional(_, { id }, { db }) {
      const _id = new ObjectId(id);
      const pipeline = [
        { $match: { _id } },
        {
          $lookup: {
            from: "services",
            localField: "services",
            foreignField: "_id",
            as: "serviceObjects"
          }
        },
        {
          $project: {
            id: "$_id",
            firstName: 1,
            lastName: 1,
            email: 1,
            gender: 1,
            taxId: 1,
            workExperience: 1,
            education: 1,
            services: {
              $map: {
                input: "$serviceObjects",
                as: "s",
                in: { id: "$$s._id", name: "$$s.name" }
              }
            }
          }
        }
      ];
      const results = await db.collection("professionals").aggregate(pipeline).toArray();
      return results[0] || null;
    },
    async employerSummary(_, { id }, { db }) {
      const _id = new ObjectId(id);
      const employer = await db.collection("employers").findOne({ _id });
      if (!employer) return null;
      const count = await db.collection("vacancies").countDocuments({ employerId: _id });
      const name = employer.companyName ?? [employer.firstName, employer.lastName].filter(Boolean).join(" ");
      return { id: String(employer._id), name, taxId: employer.taxId ?? null, vacanciesOffered: count };
    },
    async professionals(_, __, { db }) {
      const pipeline = [
        { $lookup: { from: "services", localField: "services", foreignField: "_id", as: "serviceObjects" } },
        {
          $project: {
            id: "$_id",
            firstName: 1,
            lastName: 1,
            email: 1,
            gender: 1,
            services: {
              $map: {
                input: "$serviceObjects",
                as: "s",
                in: { id: "$$s._id", name: "$$s.name" }
              }
            }
          }
        }
      ];
      return await db.collection("professionals").aggregate(pipeline).toArray();
    },
    async vacancies(_, __, { db }) {
      const pipeline = [
        { $lookup: { from: "services", localField: "serviceId", foreignField: "_id", as: "s" } },
        { $lookup: { from: "employers", localField: "employerId", foreignField: "_id", as: "e" } },
        { $set: { serviceObj: { $first: "$s" }, employerObj: { $first: "$e" } } },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            id: "$_id",
            title: 1,
            location: 1,
            createdAt: { $toString: "$createdAt" },
            service: { id: "$serviceObj._id", name: "$serviceObj.name" },
            employer: {
              $ifNull: [
                "$employerObj.companyName",
                { $concat: ["$employerObj.firstName", " ", "$employerObj.lastName"] }
              ]
            }
          }
        }
      ];
      return await db.collection("vacancies").aggregate(pipeline).toArray();
    },
    async applicantsByService(_, { serviceId }, { db }) {
      const sid = new ObjectId(serviceId);
      const pipeline = [
        { $lookup: { from: "vacancies", localField: "vacancyId", foreignField: "_id", as: "v" } },
        { $match: { "v.0.serviceId": sid } },
        { $lookup: { from: "professionals", localField: "professionalId", foreignField: "_id", as: "p" } },
        { $project: { _id: 0, fullName: { $concat: [{ $first: "$p.firstName" }, " ", { $first: "$p.lastName" }] } } },
        { $group: { _id: "$fullName" } },
        { $project: { _id: 0, name: "$_id" } }
      ];
      const results = await db.collection("applications").aggregate(pipeline).toArray();
      return results.map(r => r.name);
    },
    async professionalsByServiceStats(_, __, { db }) {
      const pipeline = [
        { $unwind: "$services" },
        { $group: { _id: "$services", count: { $sum: 1 } } },
        { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "s" } },
        { $set: { serviceName: { $first: "$s.name" } } },
        { $group: { _id: null, total: { $sum: "$count" }, rows: { $push: { serviceName: "$serviceName", count: "$count" } } } },
        { $unwind: "$rows" },
        {
          $project: {
            _id: 0,
            serviceName: "$rows.serviceName",
            count: "$rows.count",
            percentage: { $round: [{ $multiply: [{ $divide: ["$rows.count", "$total"] }, 100] }, 2] }
          }
        },
        { $sort: { count: -1, serviceName: 1 } }
      ];
      return await db.collection("professionals").aggregate(pipeline).toArray();
    },
    async professionalsByGender(_, __, { db }) {
      const pipeline = [
        { $group: { _id: "$gender", count: { $sum: 1 } } },
        { $project: { _id: 0, gender: { $ifNull: ["$_id", "No especificado"] }, count: 1 } },
        { $sort: { count: -1 } }
      ];
      return await db.collection("professionals").aggregate(pipeline).toArray();
    }
  },
  Mutation: {
    async createService(_, { name }, { db }) {
      const { insertedId } = await db.collection("services").insertOne({ name });
      return { id: insertedId, name };
    },
    async registerEmployer(_, { data }, { db }) {
      const isCompany = !!(data.companyName && data.companyName.trim().length);
      const isPerson = !!((data.firstName && data.firstName.trim()) || (data.lastName && data.lastName.trim()));
      if (!isCompany && !isPerson) throw new UserInputError("Debe indicar companyName (jurídica) o firstName/lastName (física).");
      const doc = {
        employerType: data.type ?? null,
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        companyName: isCompany ? data.companyName.trim() : null,
        taxId: data.taxId?.trim() || null
      };
      const { insertedId } = await db.collection("employers").insertOne(doc);
      const name = doc.companyName ?? [doc.firstName, doc.lastName].filter(Boolean).join(" ");
      return { id: String(insertedId), name, taxId: doc.taxId, vacanciesOffered: 0 };
    },
    async registerProfessional(_, { data }, { db }) {
      const serviceIds = (data.services || []).map(id => new ObjectId(id));
      const doc = {
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        gender: data.gender ?? null,
        taxId: data.taxId ?? null,
        services: serviceIds,
        education: [],
        workExperience: []
      };
      const { insertedId } = await db.collection("professionals").insertOne(doc);
      const newProfessional = await db.collection("professionals").findOne({ _id: insertedId });
      const serviceObjects = await db.collection("services").find({ _id: { $in: newProfessional.services } }).toArray();
      return { id: String(newProfessional._id), ...newProfessional, services: serviceObjects.map(s => ({ id: String(s._id), name: s.name })) };
    },
    async assignServicesToProfessional(_, { professionalId, serviceIds }, { db }) {
      const _id = new ObjectId(professionalId);
      const sIds = serviceIds.map(id => new ObjectId(id));
      await db.collection("professionals").updateOne({ _id }, { $set: { services: sIds } });
      return true;
    },
    
    async addWorkExperience(_, { professionalId, experience }, { db }) {
      const _id = new ObjectId(professionalId);
      const professional = await db.collection("professionals").findOne({ _id });
      if (!professional) {
          throw new UserInputError("El profesional no fue encontrado.");
      }
      
      const updateResult = await db.collection("professionals").updateOne(
          { _id },
          { $push: { workExperience: experience } }
      );
      
      if (updateResult.modifiedCount > 0) {
        const updatedProfessional = await db.collection("professionals").findOne({ _id });
        const serviceObjects = await db.collection("services").find({ _id: { $in: updatedProfessional.services } }).toArray();
        return {
          id: String(updatedProfessional._id),
          ...updatedProfessional,
          services: serviceObjects.map(s => ({ id: String(s._id), name: s.name }))
        };
      }
      
      throw new Error("No se pudo agregar la experiencia laboral.");
    },

    async addEducation(_, { professionalId, education }, { db }) {
      const _id = new ObjectId(professionalId);
      const professionalExists = await db.collection("professionals").findOne({ _id });
      if (!professionalExists) {
          throw new UserInputError("El profesional no fue encontrado.");
      }
      
      const updateResult = await db.collection("professionals").updateOne(
          { _id },
          { $push: { education: education } }
      );
      
      if (updateResult.modifiedCount > 0) {
          const updatedProfessional = await db.collection("professionals").findOne({ _id });
          const serviceObjects = await db.collection("services").find({ _id: { $in: updatedProfessional.services } }).toArray();
          return {
              id: String(updatedProfessional._id),
              ...updatedProfessional,
              services: serviceObjects.map(s => ({ id: String(s._id), name: s.name }))
          };
      }
      
      throw new Error("No se pudo agregar la educación.");
    },

    async applyToVacancy(_, { professionalId, vacancyId }, { db }) {
      const pId = new ObjectId(professionalId);
      const vId = new ObjectId(vacancyId);
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const applicationsCount = await db.collection("applications").countDocuments({
        professionalId: pId,
        appliedAt: {
          $gte: startOfMonth
        }
      });
      
      if (applicationsCount >= 3) {
        throw new UserInputError("No puedes postular a más de 3 puestos por mes.");
      }

      const doc = {
        professionalId: pId,
        vacancyId: vId,
        appliedAt: today
      };
      
      try {
        await db.collection("applications").insertOne(doc);
        return true;
      } catch (e) {
        if (e.code === 11000) {
          throw new UserInputError("Ya te has postulado a esta vacante.");
        }
        throw e;
      }
    },
    async createVacancy(_, { title, serviceId, employerId, location }, { db }) {
      const sId = new ObjectId(serviceId);
      const eId = new ObjectId(employerId);
      
      const service = await db.collection("services").findOne({ _id: sId });
      const employer = await db.collection("employers").findOne({ _id: eId });
    
      if (!service) {
        throw new UserInputError("El ID del servicio no es válido.");
      }
      
      if (!employer) {
        throw new UserInputError("El ID del empleador no es válido.");
      }
      
      const doc = {
        title,
        serviceId: sId,
        employerId: eId,
        location,
        createdAt: new Date()
      };
      
      const { insertedId } = await db.collection("vacancies").insertOne(doc);
      
      const employerName = employer.companyName || [employer.firstName, employer.lastName].filter(Boolean).join(" ");
      
      return {
        id: String(insertedId),
        title: doc.title,
        service: { id: String(service._id), name: service.name },
        employer: employerName,
        location: doc.location,
        createdAt: doc.createdAt.toISOString()
      };
    }
  }
};

module.exports = resolvers;