export const Test = () => {
  return (
    <div className="bg-red-500 text-[#000000]">
      <span className="dark:bg-white">Hello</span>
      {/* @ds-ignore */}
      <span className="bg-blue-600">Ignored</span>
    </div>
  );
};
