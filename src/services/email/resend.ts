// TODO: implement — email service via Resend.
// Digest emails carry counts + titles only — never amounts, dates, or document details.

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
