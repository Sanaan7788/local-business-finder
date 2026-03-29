export function DeploymentTab({ business }: { business: any }) {
  return (
    <div className="space-y-4">
      {business.deployedUrl ? (
        <>
          <div className="flex gap-3">
            {business.githubUrl && (
              <a href={business.githubUrl} target="_blank" rel="noreferrer"
                className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                GitHub →
              </a>
            )}
            <a href={business.deployedUrl} target="_blank" rel="noreferrer"
              className="text-sm text-white bg-black px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              Open Live Site →
            </a>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b">{business.deployedUrl}</div>
            <iframe src={business.deployedUrl} className="w-full h-96 bg-white" title="Deployed site" />
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-2">Not deployed yet.</p>
          <p className="text-xs">Generate a website first, then deploy.</p>
        </div>
      )}
    </div>
  )
}
