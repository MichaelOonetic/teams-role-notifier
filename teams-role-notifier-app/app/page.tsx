import Link from "next/link";

type HomeProps = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
  }>;
};

export default async function Home({
  searchParams,
}: HomeProps) {
  const params = await searchParams;

  const connected = params?.connected === "true";
  const error = params?.error;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 p-12">

        <div className="text-center">

          <h1 className="text-5xl font-bold text-slate-800">
            Teams Role Notifier
          </h1>

          <p className="mt-6 text-xl text-slate-600">
            Send Microsoft Teams notifications directly from monday.com
          </p>

          <p className="mt-4 text-slate-500 leading-7">
            Automatically notify people and Microsoft Teams group chats whenever an automation is triggered in monday.com.
          </p>

        </div>

        {connected && (
          <div className="mt-8 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
            <strong>✅ Microsoft account connected successfully.</strong>
            <br />
            Your account is now ready to send Microsoft Teams notifications.
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            <strong>Connection failed.</strong>
            <br />
            Please try again. If the problem persists, contact your administrator.
          </div>
        )}

        <div className="mt-12 flex flex-col md:flex-row gap-4 justify-center">

          <a
  href="/api/auth/microsoft/login"
  target="_blank"
  rel="noopener noreferrer"
            className="rounded-xl bg-[#6264A7] px-8 py-4 text-white text-lg font-semibold text-center hover:opacity-90 transition"
          >
            Connect with Microsoft
          </a>

          <Link
            href="/config"
            className="rounded-xl border border-slate-300 px-8 py-4 text-lg font-semibold text-slate-700 text-center hover:bg-slate-100 transition"
          >
            Open Configuration
          </Link>

        </div>

        <div className="mt-14">

          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            Features
          </h2>

          <div className="grid gap-4">

            <div className="rounded-lg border p-4">
              👤 <strong>One person</strong>
              <br />
              Send a private Microsoft Teams message to one person.
            </div>

            <div className="rounded-lg border p-4">
              👥 <strong>Multiple people</strong>
              <br />
              Notify several people from monday.com People columns.
            </div>

            <div className="rounded-lg border p-4">
              👨‍👩‍👧‍👦 <strong>Teams Groups</strong>
              <br />
              Notify one or more Microsoft Teams group chats.
            </div>

            <div className="rounded-lg border p-4">
              🚀 <strong>Advanced notification</strong>
              <br />
              Combine private notifications and Teams group notifications.
            </div>

          </div>

        </div>

        <div className="mt-12 border-t pt-6 text-center text-sm text-slate-500">

          Teams Role Notifier v1.0

          <br />

          © OONETIC

        </div>

      </div>
    </main>
  );
}