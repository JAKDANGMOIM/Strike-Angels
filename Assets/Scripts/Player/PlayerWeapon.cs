using System.Collections;
using UnityEngine;

public class PlayerWeapon : MonoBehaviour
{
    [Header("무기 설정")]
    [SerializeField] private GameObject bulletPrefab;
    [SerializeField] private Transform firePoint;
    [SerializeField] private float fireRate = 0.5f; // 초당 발사 횟수
    [SerializeField] private float bulletSpeed = 10f;
    [SerializeField] private int bulletDamage = 1;
    
    // 내부 변수
    private float fireTimer;
    
    private void Awake()
    {
        // 만약 발사 지점이 없으면 자신을 발사 지점으로 설정
        if (firePoint == null)
        {
            firePoint = transform;
            Debug.LogWarning("FirePoint가 설정되지 않았습니다. Player를 발사 지점으로 사용합니다.");
        }
    }
    
    private void Start()
    {
        // 기본 발사 시작을 위해 타이머를 0으로 설정
        fireTimer = 0f;
    }
    
    private void Update()
    {
        // 자동 발사 타이머 업데이트
        fireTimer -= Time.deltaTime;
        
        // 발사 간격이 지나면 자동으로 발사
        if (fireTimer <= 0f)
        {
            Fire();
            fireTimer = 1f / fireRate; // 발사 간격 재설정
        }
    }
    
    private void Fire()
    {
        if (bulletPrefab == null)
        {
            Debug.LogError("총알 프리팹이 설정되지 않았습니다!");
            return;
        }
        
        // 총알 생성
        GameObject bullet = Instantiate(bulletPrefab, firePoint.position, firePoint.rotation);
        
        // Bullet 컴포넌트가 있으면 데미지 설정
        Bullet bulletComponent = bullet.GetComponent<Bullet>();
        if (bulletComponent != null)
        {
            bulletComponent.SetDamage(bulletDamage);
        }
        
        // 총알의 Rigidbody2D 컴포넌트 가져오기
        Rigidbody2D rb = bullet.GetComponent<Rigidbody2D>();
        if (rb != null)
        {
            // 속도 설정
            rb.linearVelocity = firePoint.up * bulletSpeed;
            Debug.Log("총알 발사: 위치=" + bullet.transform.position + ", 속도=" + rb.linearVelocity);
        }
        else
        {
            Debug.LogWarning("총알에 Rigidbody2D가 없습니다!");
        }
    }
    
    // 공개 메서드 - 다른 스크립트에서 접근 가능
    
    // 화력 증가 (스킬 시스템용)
    public void IncreaseDamage(int amount)
    {
        bulletDamage += amount;
    }
    
    // 발사 속도 증가 (스킬 시스템용)
    public void IncreaseFireRate(float amount)
    {
        fireRate += amount;
    }
} 