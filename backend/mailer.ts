import mailjet from "node-mailjet";

export type Mailer = {
  send(email: string, subject: string, text: string): any;
};

export const getMailer = (spec: string, emailFrom: string): Mailer => {
  if (!emailFrom) {
    throw new Error("emailFrom is missing");
  }
  const i = spec.indexOf(":");
  const type = spec.substring(0, i);
  if (type !== "mailjet") {
    throw new Error(`expected mailjet env var in NOTIFIER`);
  }
  const params = spec.substring(i + 1, spec.length);
  const [key, secret] = params.split(":");
  const mailClient = mailjet.connect(key, secret);
  return {
    send(email: string, subject: string, text: string) {
      const request = mailClient.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: { Email: emailFrom, Name: "pi" },
            To: [{ Email: email, Name: "" }],
            Subject: subject,
            TextPart: text,
          },
        ],
      });
      return request;
    },
  };
};
