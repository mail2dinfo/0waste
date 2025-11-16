import { NwUser } from "../models/NwUser.js";
import { NwEvent } from "../models/NwEvent.js";
import { NwReportPayment } from "../models/NwReportPayment.js";
import { Op } from "sequelize";

export async function getAdminStats() {
  const [
    totalUsers,
    totalEvents,
    paidEvents,
    unpaidEvents,
    eventsInProgress,
  ] = await Promise.all([
    NwUser.count(),
    NwEvent.count(),
    NwEvent.count({ where: { reportStatus: "paid" } }),
    NwEvent.count({ where: { reportStatus: "unpaid" } }),
    NwEvent.count({
      where: {
        [Op.or]: [
          { status: "draft" },
          { status: "published" },
        ],
        reportStatus: { [Op.ne]: "paid" },
      },
    }),
  ]);

  return {
    totalUsers,
    totalEvents,
    paidEvents,
    unpaidEvents,
    eventsInProgress,
  };
}

export async function getAdminEventLists() {
  const [paidEvents, unpaidEvents, inProgressEvents] = await Promise.all([
    NwEvent.findAll({
      where: { reportStatus: "paid" },
      include: [{ association: "owner", attributes: ["id", "fullName", "email", "phoneNumber"] }],
      order: [["updatedAt", "DESC"]],
      limit: 100,
    }),
    NwEvent.findAll({
      where: { reportStatus: "unpaid" },
      include: [{ association: "owner", attributes: ["id", "fullName", "email", "phoneNumber"] }],
      order: [["createdAt", "DESC"]],
      limit: 100,
    }),
    NwEvent.findAll({
      where: {
        [Op.or]: [
          { status: "draft" },
          { status: "published" },
        ],
        reportStatus: { [Op.ne]: "paid" },
      },
      include: [{ association: "owner", attributes: ["id", "fullName", "email", "phoneNumber"] }],
      order: [["createdAt", "DESC"]],
      limit: 100,
    }),
  ]);

  return {
    paidEvents: paidEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      location: e.location,
      status: e.status,
      reportStatus: e.reportStatus,
      owner: e.owner
        ? {
            id: e.owner.id,
            fullName: e.owner.fullName,
            email: e.owner.email,
            phoneNumber: e.owner.phoneNumber,
          }
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    unpaidEvents: unpaidEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      location: e.location,
      status: e.status,
      reportStatus: e.reportStatus,
      owner: e.owner
        ? {
            id: e.owner.id,
            fullName: e.owner.fullName,
            email: e.owner.email,
            phoneNumber: e.owner.phoneNumber,
          }
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    inProgressEvents: inProgressEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      location: e.location,
      status: e.status,
      reportStatus: e.reportStatus,
      owner: e.owner
        ? {
            id: e.owner.id,
            fullName: e.owner.fullName,
            email: e.owner.email,
            phoneNumber: e.owner.phoneNumber,
          }
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  };
}

export async function getAllUsers() {
  const users = await NwUser.findAll({
    attributes: ["id", "fullName", "email", "phoneNumber", "role", "createdAt"],
    order: [["createdAt", "DESC"]],
  });

  return users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

