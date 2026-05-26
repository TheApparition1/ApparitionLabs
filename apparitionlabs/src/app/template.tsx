import { Suspense } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Suspense fallback={null}>
                {children}
            </Suspense>
        </div>
    );
}
