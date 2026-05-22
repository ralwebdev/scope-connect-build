import { PlatformConfig } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

const defaultConfig = {
  brand: {
    name: "Scope Connect",
    contactEmail: "support@scopeconnect.com",
    logoText: "Scope Connect",
  },
  contact: {
    supportEmail: "support@scopeconnect.com",
    partnershipEmail: "partners@scope.in",
  },
  features: {
    enableXP: true,
    enableMarketplace: true,
    enableChallenges: true,
  },
  campuses: [],
};

export async function getConfig(req, res) {
  let config = await PlatformConfig.findOne({});
  if (!config) {
    config = await PlatformConfig.create(defaultConfig);
  }
  sendSuccess(res, { config });
}

export async function updateConfig(req, res) {
  let config = await PlatformConfig.findOne({});
  if (!config) {
    config = new PlatformConfig(defaultConfig);
  }
  
  if (req.body.brand) config.brand = { ...config.brand, ...req.body.brand };
  if (req.body.contact) config.contact = { ...config.contact, ...req.body.contact };
  if (req.body.features) config.features = { ...config.features, ...req.body.features };
  if (req.body.campuses) config.campuses = req.body.campuses;
  
  await config.save();
  sendSuccess(res, { config });
}
