export default function LoginInfoBanner() {
  return (
    <div className="flex gap-3 rounded-lg border border-[#93C5FD] bg-[#DBEAFE] p-4">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm leading-relaxed text-blue-900">
        All company staff can access Intel Dash using their Google Workspace
        account. No sign-up or invitation needed.
      </p>
    </div>
  );
}
