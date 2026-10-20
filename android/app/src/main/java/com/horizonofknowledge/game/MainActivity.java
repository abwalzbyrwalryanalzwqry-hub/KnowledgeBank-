package com.horizonofknowledge.game;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // عرض من الحافة إلى الحافة كما توصي Capacitor 8 (الهوامش تُدار عبر --safe-area-inset-* في CSS)
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
