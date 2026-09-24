import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

const ZebraBadge = ({ value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied!");
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="inline-flex items-center gap-2 px-3 py-3 mx-5 rounded-lg bg-amber-50 text-amber-500 border border-amber-100 text-sm font-medium">

            {/* Label */}
            <span className="text-xs text-gray-500 hidden lg:block font-medium">
                Branch Creation ID
            </span>

            {/* Badge */}
            <div className="inline-flex gap-1">

                <span className="truncate max-w-[140px]" title={value}>
                    {value}
                </span>

                <button
                    onClick={handleCopy}
                    className="p-1 rounded-md hover:bg-gray-200 transition"
                >
                    {copied ? (
                        <Check size={14} className="text-green-500" />
                    ) : (
                        <Copy size={14} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ZebraBadge;