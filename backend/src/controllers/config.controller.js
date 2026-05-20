import { PlatformConfig } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function getConfig(req, res) {
  let config = await PlatformConfig.findOne({});
  if (!config) {
    config = await PlatformConfig.create({
      brand: { name: "Scope Connect" },
      contact: { email: "support@scopeconnect.com" },
      features: { enableXP: true, enableMarketplace: true, enableChallenges: true },
      campuses: []
    });
  }
  sendSuccess(res, { config });
}

export async function updateConfig(req, res) {
  let config = await PlatformConfig.findOne({});
  if (!config) {
    config = new PlatformConfig({});
  }
  
  if (req.body.brand) config.brand = { ...config.brand, ...req.body.brand };
  if (req.body.contact) config.contact = { ...config.contact, ...req.body.contact };
  if (req.body.features) config.features = { ...config.features, ...req.body.features };
  if (req.body.campuses) config.campuses = req.body.campuses;
  
  await config.save();
  sendSuccess(res, { config });
}
