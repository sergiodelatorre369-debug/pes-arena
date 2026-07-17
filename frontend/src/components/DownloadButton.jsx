export default function DownloadButton({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center w-full rounded-lg py-3 font-bold bg-home text-white"
    >
      {children}
    </a>
  );
}
